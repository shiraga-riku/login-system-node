const express = require("express");
const log4js = require('log4js')
const logger = log4js.getLogger();
logger.level = 'trace';

const app  = express();
const PORT = 3000;

app.listen(PORT, () => console.log("サーバーが起動しました。"));

app.get("/", (req, res) => {
  logger.info("hoge");
  res.send("hoge");
});