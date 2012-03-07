const
express = require('express'),
mysql = require('mysql');

var client = mysql.createClient({
  user: 'nodeuser',
  password: 'nodeuser'
});

function bumpCounter() {
    client.query('USE nodedemo');
    client.query("UPDATE counter SET value = value + 1 WHERE name = 'main'");
}

function readCounter(displayCounter) {
    client.query('USE nodedemo');
    client.query("SELECT value FROM counter WHERE name = 'main'", function (err, results, fields) {
                     if (err) {
                         throw err;
                     }
                     displayCounter(results[0].value);
                 });
}

var usernameRegexp = new RegExp(/^[a-z0-9_]+$/);

function createAccount(username, handleResult) {
    if (username.length < 3) {
        handleResult('Username must be at least 3 characters');
        return;
    }

    if (!username.match(usernameRegexp)) {
        handleResult('Username can only include letters, numbers and underscores.');
        return;
    }

    client.query('USE nodedemo');
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

    client.query('USE nodedemo');
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
app.use(express.bodyParser());
app.use(express.static('static'));
app.use(express.cookieParser());
app.use(express.session({ secret: "secret string in a public repo ftw!" }));

app.get('/', function(req, res) {
            res.render('index.ejs', {title: 'index', info: req.flash('info'), error: req.flash('error'),
                                     actions: ['count', 'login', 'logout', 'register'],
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

app.get('/logout', function(req, res) {
            delete req.session.username;
            res.redirect('home');
        });

app.post('/login', function(req, res) {
             var username = req.body.username;
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

app.get('/register', function(req, res) {
            res.render('register.ejs', {title: 'register', info: req.flash('info'), error: req.flash('error')});
        });

app.post('/register', function(req, res) {
             var username = req.body.username;
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

app.listen(9001);
