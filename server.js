const express = require('express');
const log4js = require('log4js')
const logger = log4js.getLogger();
logger.level = 'trace';
const User = require('./model/user');
const session = require('express-session');
const csrf = require('csurf');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config()
const app  = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
const csrfProtection  = csrf ( { cookie: false } );

// セッション定義
app.use(session({
  secret: process.env.SESSONSECRET,
  resave: false,
  saveUninitialized: false
}));

// ホーム画面表示
app.get("/", (req, res) => {
  res.sendFile(__dirname + '/html/index.html');
});

// ユーザー作成画面
app.get("/user/signup", csrfProtection, (req, res) => {
  res.render('signup', { csrfToken: req.csrfToken() });
});

// ユーザー作成処理
app.post("/user/signup", csrfProtection, async (req, res) => {
  try {
    const {name, password, email} = req.body;

    // 入力項目空白チェック
    if (!name) {
      return res.send('名前が入力させていません');
    } else if(!password) {
      return res.send('パスワードが入力されていません');
    } else if(!email) {
      return res.send('メールアドレスが入力されていません');
    }

    // 同じメールアドレスのユーザーが登録されていないかチェック
    const userdata = await User.count({where: {email:email}});

    // 既に同じユーザーが登録されているかチェック
    if (userdata < 1) {
      User.create({ name, password, email}).then(user => {
        res.status(201).send('ユーザー登録に成功しました。'+ 'ユーザー名:' + user.name + '<br><a href = "/user/login">ログイン画面へ</a>');
      })
      .catch((err) => {
        logger.warn(err);
        res.status(500).send('ユーザー作成に失敗しました');
      });
    } else {
      res.status(409).send('そのユーザーは既に存在しています');
    }
  } catch(error) {
    logger.error(error);
    res.status(500).send('ユーザー作成に失敗しました');
  }
});

// ログイン画面表示
app.get("/user/login", (req, res) => {
  // ユーザーがログインしていたらログイン後の画面を表示 していない場合はログイン画面を表示
  if (!req.session.token) {
    res.render('login');
  } else {
    res.redirect('/user/afterlogin');
  }
});

// ログイン処理
app.post("/user/login", async(req, res) => {
  try {
    const { name, password, email }  = req.body;

    const userdata = await User.findOne({where: {name:name, password:password, email:email}});

    // ユーザーが登録されているかチェック
    if (!userdata) {
      return res.status(404).send('ユーザーが存在しません');
    }

    const loginUserName = userdata.name;
    const loginUserPassword = userdata.password;
    const loginUserEmail = userdata.email;

    // JWT使用しトークン作成
    const token = await jwt.sign(
      {
        loginUserName,
        loginUserPassword,
        loginUserEmail
      },
      process.env.JWTPASSWORD,
      {
        expiresIn: '24h'
      }
    );

    // セッションにトークン保存
    req.session.token = token;

    // ログイン後の画面にリダイレクト
    res.redirect('/user/afterlogin');
  } catch (error) {
    logger.error(error);
    res.status(500).send('ログイン処理に失敗しました');
  }
});

// ログイン後の画面表示
app.get("/user/afterlogin", async(req, res) => {
  // トークン存在チェック
  if (req.session.token) {
    try{
      // トークン複合化
      const token = await jwt.verify(req.session.token, process.env.JWTPASSWORD);
      const { loginUserName, loginUserPassword, loginUserEmail }  = token;

      // トークンとDBのデータがあっているかチェック
      const userdata = await User.count({where: {name:loginUserName, password:loginUserPassword, email:loginUserEmail}});

      // トークン情報のデータがDBに存在している場合
      if (userdata) {
        // ログインしているユーザーならログアウト後の画面を表示
        res.status(200).send('ログイン後の画面' + '<a href = "/user/logout">ログアウト</a>');
      } else {
        // トークン情報に誤りがあった場合ホーム画面にリダイレクト
        return res.redirect('/');
      }
    }
    catch (err){
      // エラーがあった場合ホーム画面にリダイレクト
      logger.error(err);
      return res.redirect('/');
    }
  } else {
    // ログインしていないユーザーがログイン後の画面にアクセスした場合ログイン画面にリダイレクト
    return res.redirect('/user/login');
  }
});

// ログアウト処理
app.get("/user/logout", (req, res) => {
  // ログアウトボタンを押下した場合セッションのログイン情報トークンを削除してホーム画面へリダイレクト
  req.session.token = null;
  res.redirect('/');
});

// パスワードを忘れた場合メールアドレスにパスワードを送信する
app.post("/user/forgotpassword", async(req, res) => {
  try{
    const {name, email} = req.body;

    // 入力されたユーザー名、パスワードが登録されているか確認
    const userdata = await User.findOne({where: {name:name, email:email}});

    // 登録されているユーザーと一致した場合
    if (userdata) {
      const receiverEmailAddress = email;
      const senderEmailAddress = process.env.SENDEREMAILADDRESS;

      // smtpサーバーにGmail使用
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
          user: senderEmailAddress,
          pass: process.env.GMAILAPPPASS,
        },
      });

      // メール内容
      const message = {
        from: senderEmailAddress,
        to: receiverEmailAddress,
        subject: 'ログインパスワード',
        text: userdata.password,
      };

      // メール宛にパスワード送信処理
      await transporter.sendMail(message, (err) => {
        if (err) {
          logger.error(err);
          res.status(500).send('メールの送信に失敗しました');
        } else {
          res.status(200).send('パスワードをメールアドレス宛に送信しました');
        }
      });
    } else {
      res.status(404).send('名前とメールアドレスに該当するユーザーが登録されていません');
    };
  } catch (error) {
    logger.error(error);
    res.status(500).send('メールの送信処理に失敗しました');
  }
});

// エラー処理
app.use(function (err, req, res, next) {
  logger.error(err.code);
  // csrfエラー
  if (err.code = 'EBADCSRFTOKEN'){
    res.status(401).send('ユーザー作成資格がありません。');
  }
});

// ポート番号
const PORT = 3000;
// サーバー構築
app.listen(PORT, () => logger.info('サーバーが起動しました。'));