
const crypto = require("crypto");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const uname = "admin";         
const hashpass = hashPassword('admin123');
const ins_pass = 'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)'

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS slots');
    db.run('CREATE TABLE slots (date TEXT, time TEXT, available INTEGER, name TEXT, phone INTEGER, reason TEXT, age INTEGER, PRIMARY KEY (date, time))');

    db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
        )
    `);
    db.run(ins_pass, [uname, hashpass], (err) => {
        if (err) console.error("Failed to create admin table:", err);
        else console.log("Admin table ready");
        });
    
});

db.close();