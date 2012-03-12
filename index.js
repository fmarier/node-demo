#!/usr/bin/node

const
crypto = require('crypto'),
express = require('express'),
form = require('connect-form'),
fs = require('fs'),
util = require('util'),
mysql = require('mysql');

var client = mysql.createClient({
  user: 'nodeuser',
  password: 'nodeuser'
});
client.query('USE nodedemo');

function bumpCounter() {
    client.query("UPDATE counter SET value = value + 1 WHERE name = 'main'");
}

function readCounter(displayCounter) {
    client.query("SELECT value FROM counter WHERE name = 'main'", function (err, results, fields) {
                     if (err) {
                         throw err;
                     }
                     displayCounter(results[0].value);
                 });
}

function getUserProfile(username, displayProfile) {
    if (!username) {
        displayProfile();
        return;
    }

    client.query("SELECT * FROM accounts WHERE username = ?", [username], function (err, results, fields) {
                     if (err) {
                         throw err;
                     }
                     displayProfile(results[0]);
                 });
}

var nameRegexp = new RegExp(/^[A-Za-z\-]+$/);
var emailRegexp = new RegExp(/^.+@.+\..+$/);

function updateUserProfile(username, fields, files, handleResult) {
    if (username !== fields.username) {
        handleResult('Changing your username is not allowed.');
        return;
    }

    if ((fields.firstname && !fields.firstname.match(nameRegexp)) ||
        (fields.lastname && !fields.lastname.match(nameRegexp))) {
        handleResult('First and last names can only include letters and hyphens.');
        return;
    }
    if (fields.email && !fields.email.match(emailRegexp)) {
        handleResult('Invalid email address.');
        return;
    }
    if (files.photo.name && files.photo.type != 'image/jpeg' && files.photo.type != 'image/png') {
        handleResult('Unsupported image format: ' + files.photo.type);
        return;
    }

    if (files.photo.name) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(username + '|' + Date.now() + files.photo.name);
        var randomName = md5sum.digest('hex') + (files.photo.type === 'image/png' ? '.png' : '.jpg');

        // Delete old photo if it exists (we're assuming that random name is unique)
        client.query('SELECT photo FROM accounts WHERE username = ?', [username], function (err, results, fields) {
                         if (err) {
                             throw err;
                         } else {
                             fs.unlink('static/photos/' + results[0].photo);
                         }
                     });

        // Can't use fs.rename across filesystem boundaries (http://stackoverflow.com/questions/4568689)
        var is = fs.createReadStream(files.photo.path);
        var os = fs.createWriteStream('static/photos/' + randomName);
        util.pump(is, os, function (err) {
                      fs.unlink(files.photo.path);
                      if (err) {
                          throw err;
                      } else {
                          client.query('UPDATE accounts SET photo = ? WHERE username = ?', [randomName, username], function (err) {
                                           if (err) {
                                               throw err;
                                           }
                                       });
                      }
                  });
    }

    var data = [{field: "firstname", value: fields.firstname || undefined},
                {field: "lastname", value: fields.lastname || undefined},
                {field: "email", value: fields.email || undefined}
               ];
    var values = [];

    var sql = 'UPDATE accounts SET ';
    for (var i=0; i < data.length; i++) {
        if (i > 0) {
            sql += ', ';
        }
        sql += data[i].field + " = ?";
        values.push(data[i].value);
    }
    sql += " WHERE username = ?";
    values.push(username);

    client.query(sql, values, function (err) {
                     if (err) {
                         throw err;
                     }
                     handleResult();
                 });
}

var usernameRegexp = new RegExp(/^[A-Za-z0-9_]+$/);

function createAccount(username, handleResult) {
    if (username.length < 3) {
        handleResult('Username must be at least 3 characters');
        return;
    }

    if (!username.match(usernameRegexp)) {
        handleResult('Username can only include letters, numbers and underscores.');
        return;
    }

    client.query("INSERT INTO accounts(username) VALUES (?)", [username], function (err, results, field) {
                     if (err) {
                         handleResult(err);
                     } else {
                         handleResult();
                     }
                 });
}

function authenticateUser(username, logUserIn) {
    if (!username) {
        logUserIn('Missing username');
        return;
    }

    client.query("SELECT id FROM accounts where username = ?", [username], function (err, results, field) {
                     if (err) {
                         logUserIn(err);
                     } else {
                         if (results.length > 0) {
                             logUserIn();
                         } else {
                             logUserIn('Username not found. Have you registered yet?');
                         }
                     }
                 });
}

const app = express.createServer();
app.use(express.limit('1mb'));
app.use(express.static('static'));
app.use(express.cookieParser());
app.use(express.session({ secret: "secret string in a public repo ftw!" }));
app.use(form({ keepExtensions: true }));
//app.use(express.bodyParser()); // FIXME: re-enable with express 3 which can parse files submitted in form data

app.get('/', function(req, res) {
            res.render('index.ejs', {title: 'index', info: req.flash('info'), error: req.flash('error'),
                                     actions: ['count', 'login', 'logout', 'profile', 'register'],
                                     username: req.session.username});
        });

app.get('/count', function(req, res) {
            readCounter(function (countValue) {
                            res.render('count.ejs', {title: 'count', info: req.flash('info'), error: req.flash('error'),
                                                     count: countValue});
                            bumpCounter();
                        });
        });

app.get('/login', function(req, res) {
            res.render('login.ejs', {title: 'login', info: req.flash('info'), error: req.flash('error')});
        });

app.post('/login', function(req, res) {
             req.form.complete(function (err, fields, files) {
                                   var username = fields.username;
                                   authenticateUser(username, function (error) {
                                                        if (error) {
                                                            req.flash('error', error);
                                                            res.render('login.ejs', {title: 'login', info: req.flash('info'), error: req.flash('error')});
                                                        } else {
                                                            req.flash("info", username + " logged in");
                                                            req.session.username = username;
                                                            res.redirect('home');
                                                        }
                                                    });
                               });
         });

app.get('/logout', function(req, res) {
            delete req.session.username;
            res.redirect('home');
        });

app.get('/profile', function(req, res) {
            getUserProfile(req.session.username, function (account) {
                               if (account) {
                                   res.render('profile.ejs', {title: 'profile', info: req.flash('info'), error: req.flash('error'),
                                                              account: account});
                               } else {
                                   res.redirect('home');
                               }
                           });
        });

app.post('/profile', function(req, res) {
             req.form.complete(function (err, fields, files) {
                                   if (err) {
                                       next(err);
                                   } else {
                                       updateUserProfile(req.session.username, fields, files, function (error) {
                                                             if (error) {
                                                                 req.flash('error', error);
                                                                 res.redirect('/profile');
                                                             } else {
                                                                 req.flash("info", req.session.username + " updated");
                                                                 res.redirect('home');
                                                             }
                                                         });
                                   }
                               });
         });

app.get('/register', function(req, res) {
            res.render('register.ejs', {title: 'register', info: req.flash('info'), error: req.flash('error')});
        });

app.post('/register', function(req, res) {
             req.form.complete(function (err, fields, files) {
                                   var username = fields.username;
                                   if (!username) {
                                       res.redirect('home');
                                       return;
                                   }
                                   createAccount(username, function (error) {
                                                     if (error) {
                                                         req.flash('error', error);
                                                         res.render('register.ejs', {title: 'register', info: req.flash('info'), error: req.flash('error')});
                                                     } else {
                                                         req.flash("info", username + " user account successfully created");
                                                         res.redirect('home');
                                                     }
                                                 });
                               });
         });

app.listen(9001);
