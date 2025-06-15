const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./messages.db');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB INIT
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT,
    destinataire TEXT,
    content TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // ADMIN setup
  const hash = crypto.createHash('sha256').update('motsdepassa123').digest('hex');
  db.run(`INSERT OR IGNORE INTO users (pseudo, password) VALUES (?, ?)`, ['ADMIN', hash]);
});

// Routes
app.post('/api/login', (req, res) => {
  const { pseudo, password } = req.body;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  db.get(`SELECT * FROM users WHERE pseudo = ? AND password = ?`, [pseudo, hash], (err, row) => {
    if (row) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  });
});

app.post('/api/register', (req, res) => {
  const { pseudo, password } = req.body;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  db.run(`INSERT INTO users (pseudo, password) VALUES (?, ?)`, [pseudo, hash], function(err) {
    if (err) {
      res.json({ success: false, message: 'Pseudo déjà pris' });
    } else {
      res.json({ success: true });
    }
  });
});

app.post('/api/message', (req, res) => {
  const { pseudo, content } = req.body;
  let destinataire = null;
  let msgContent = content;

  if (content.startsWith('/msg ')) {
    const parts = content.split(' ');
    destinataire = parts[1];
    msgContent = parts.slice(2).join(' ');
  }

  db.run(`INSERT INTO messages (pseudo, destinataire, content) VALUES (?, ?, ?)`, [pseudo, destinataire, msgContent], () => {
    res.json({ success: true });
  });
});

app.get('/api/messages/:pseudo', (req, res) => {
  const pseudo = req.params.pseudo;
  db.all(`SELECT * FROM messages WHERE destinataire IS NULL OR destinataire = ? OR pseudo = ? ORDER BY date ASC`, [pseudo, pseudo], (err, rows) => {
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
