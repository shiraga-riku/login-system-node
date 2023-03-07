const express = require('express');
const log4js = require('log4js')
const logger = log4js.getLogger();
logger.level = 'trace';
const User = require('./model/user');

const app  = express();
const PORT = 3000;
app.set("view engine", "ejs");
app.listen(PORT, () => console.log("サーバーが起動しました。"));

app.get("/", (req, res) => {
  User.findAll().then(users => {
    res.send(users);
  });
});