const express = require('express');

const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const path = require('path'); //we def gonna needdat shi'

//configuration -> webManiacApp
const config = require('./config/config');


const app = express();

// TODO: add that infos to config.js
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'webManiac',
});

// connect db
db.connect((err) => {
    if (err) {
      console.log('MySQL bağlantısı başarısız: ' + err.message);
      throw err;
    }
    console.log('MySQL bağlantısı başarılı!');
    
    // Tabloyu oluştur
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wmUsername VARCHAR(255) NOT NULL,
        wmPassword VARCHAR(255) NOT NULL,
        wmIPAddress VARCHAR(15),
        wmRegistrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        wmLastLogin TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
        wmPlayerCredit INT DEFAULT 0,
        wmBrowser VARCHAR(255),
        wmDevice VARCHAR(255),
        wmRankId INT DEFAULT 1
      )
    `; // rankId should be synced with other rank plugins like permissionx, zranks, luckperms and more.
    
    db.query(createTableSql, (err, result) => {
      if (err) throw err;
      console.log('users tablosu oluşturuldu veya zaten mevcut.');
    });
  });

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// maximizing style
app.use(express.static(path.join(__dirname, 'public')));

// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'your_secret_key',
  resave: true,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.render('land', {config});
});

app.get('/register', (req, res) => {
    res.render('register');
  });
  
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip;

    const sql = 'INSERT INTO users (wmUsername, wmPassword, wmIPAddress) VALUES (?, ?, ?)';
    
    db.query(sql, [username, password, ipAddress], (err, result) => {
      if (err) {
        console.error('Kullanıcı kaydı başarısız:', err);
        res.status(500).send('Kullanıcı kaydı başarısız.');
      } else {
        console.log('Kullanıcı başarıyla kaydedildi.');
        res.redirect('/');
      }
    });
});
  

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip;
    const browser = req.headers['user-agent'];
    const device = req.headers['user-agent'];
    const sql = 'SELECT * FROM users WHERE wmUsername = ? AND wmPassword = ?';
    
    db.query(sql, [username, password], (err, results) => {
      if (err) {
        console.error('Giriş başarısız:', err);
        res.status(500).send('Giriş başarısız.');
      } else if (results.length > 0) {
        const userId = results[0].id;
        const updateLoginInfoSql = 'UPDATE users SET wmLastLogin = CURRENT_TIMESTAMP, wmIPAddress = ?, wmBrowser = ?, wmDevice = ? WHERE id = ?';
        db.query(updateLoginInfoSql, [ipAddress, browser, device, userId], (updateErr, updateResult) => {
          if (updateErr) {
            console.error('Giriş başarısız:', updateErr);
            res.status(500).send('Giriş başarısız.');
          } else {
            console.log('Başarıyla giriş yaptı.');
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/dashboard');
          }
        });
      } else {
        res.status(401).send('Hatalı giriş.');
      }
    });
});
  

const checkSession = (req, res, next) => {
  if (req.session.loggedin) {
    next();
  } else {
    res.send('Giriş yapmadınız!');
  }
};

app.get('/dashboard', checkSession, (req, res) => {
  res.send('Selam kuna tennim, ' + req.session.username + '!');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
