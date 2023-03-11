const express = require('express');
const log4js = require('log4js')
const logger = log4js.getLogger();
logger.level = 'trace';
const User = require('./model/user');
const session = require('express-session');
const csrf = require('csurf');
const jwt = require('jsonwebtoken');
const app  = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
const csrfProtection  = csrf ( { cookie: false } );
app.use(session({
  secret: 'shiraga',
  resave: false,
  saveUninitialized: false
}));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/html/index.html');
});

app.get("/user/signup", csrfProtection, (req, res) => {
  res.render('signup', { csrfToken: req.csrfToken() });
});

app.post("/user/signup", csrfProtection, async (req, res) => {

  const name = req.body.name;
  const password = req.body.password;
  const email = req.body.email;

  if (!name) {
    return res.send('名前を入力してください');
  } else if(!password) {
    return res.send('パスワードを入力してください');
  } else if(!email) {
    return res.send('メールアドレスを入力してください');
  }

  const userdata = await User.count({where: {name:name, password:password, email:email}});

  if (userdata < 1) {
    User.create({ name, password, email}).then(user => {
      res.send('ユーザー登録に成功しました。' + '<a href = "/user/login">ログイン画面へ</a>');
    });
  } else {
    res.send('そのユーザーは既に存在しています。');
  }
  
});

app.get("/user/login", (req, res) => {
  if (!req.session.token) {
    res.render('login');
  } else {
    res.redirect('/user/afterlogin');
  }
});

app.post("/user/login", async(req, res) => {
  const { name, password, email }  = req.body;
  const userdata = await User.findOne({where: {name:name, password:password, email:email}});
  if (!userdata) {
    return res.send('ユーザーが存在しません');
  }
  const loginUserName = userdata.name;
  const loginUserPassword = userdata.password;
  const loginUserEmail = userdata.email;
  const token = await jwt.sign(
    {
      loginUserName,
      loginUserPassword,
      loginUserEmail
    },
    'himitsu',
    {
      expiresIn: '24h'
    }
  );
  req.session.token = token;
  res.redirect('/user/afterlogin');
});

app.get("/user/afterlogin", async(req, res) => {
  if (req.session.token) {
    try{
      const token = await jwt.verify(req.session.token, 'himitsu');
      const { loginUserName, loginUserPassword, loginUserEmail }  = token;
      const userdata = await User.count({where: {name:loginUserName, password:loginUserPassword, email:loginUserEmail}});
      if (userdata) {
        res.send('ログイン後の画面' + '<a href = "/user/logout">ログアウト</a>');
      } else {
        return res.redirect('/');
      }
    }
    catch{
      return res.redirect('/');
    }
  } else {
    return res.redirect('/');
  }
});

app.get("/user/logout", function( req, res ){
  req.session.token = null;
  res.redirect( '/' );
});

// エラー処理
app.use(function (err, req, res, next) {
  logger.info(err.code);
  if (err.code = 'EBADCSRFTOKEN'){
    res.status(401).send('ユーザー作成資格がありません。');
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log("サーバーが起動しました。"));