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

const app = express.createServer();
app.get('/', function(req, res) {
            res.render('index.ejs', {title: 'index', layout: true});
        });

app.get('/count', function(req, res) {
            readCounter(function (countValue) {
                            res.render('count.ejs', {title: 'count', count: countValue, layout: true});
                            bumpCounter();
                        });
        });

app.listen(9001);
