const
mysql = require('mysql');

var client = mysql.createClient({
  user: 'nodeuser',
  password: 'nodeuser'
});
client.query('USE nodedemo');

exports.bump = function () {
    client.query("UPDATE counter SET value = value + 1 WHERE name = 'main'");
};

exports.read = function(displayCounter) {
    client.query("SELECT value FROM counter WHERE name = 'main'", function (err, results, fields) {
                     if (err) {
                         throw err;
                     }
                     displayCounter(results[0].value);
                 });
};
