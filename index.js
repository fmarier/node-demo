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

const app = express.createServer();
app.use(express.limit('1mb'));
app.use(express.bodyParser());
app.use(express.static('static'));

app.get('/', function(req, res) {
            res.render('index.ejs', {title: 'index', actions: ['count', 'register']});
        });

app.get('/count', function(req, res) {
            readCounter(function (countValue) {
                            res.render('count.ejs', {title: 'count', count: countValue});
                            bumpCounter();
                        });
        });

app.get('/register', function(req, res) {
            res.render('register.ejs', {title: 'register', error: false});
        });

app.post('/register', function(req, res) {
             var username = req.body.username;
             if (!username) {
                 res.redirect('home');
                 return;
             }
             createAccount(username, function (error) {
                               if (error) {
                                   res.render('register.ejs', {title: 'register', error: error});
                               } else {
                                   // TODO: convert to req.flash()
                                   console.log(username + ' user account successfully created');
                                   res.redirect('home');
                               }
                           });
         });

app.listen(9001);
