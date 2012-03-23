CREATE TABLE accounts ( id INT(11) AUTO_INCREMENT, username VARCHAR(255), password VARCHAR(255), firstname VARCHAR(255), lastname VARCHAR(255), email VARCHAR(255), photo VARCHAR(255), PRIMARY KEY (id));
CREATE TABLE counter ( id INT(11) AUTO_INCREMENT, name VARCHAR(255), value INT, PRIMARY KEY (id));
INSERT INTO counter (name, value) VALUES ('main', 0);
