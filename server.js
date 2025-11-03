
require('./init-db.js');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment-timezone');
const PORT = process.env.PORT || 3000;

const bodyParser = require("body-parser");
const crypto = require("crypto");

const path = require('path')

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/HomePage.html');
});

// Connect to database
const db = new sqlite3.Database('database.db');

app.get('/slots', (req, res) => {
    const query = `SELECT date, time, available, name, phone, reason, age FROM slots`; // adjust table name if needed
    db.all(query, [], (err, rows) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }

    const date = rows.map(row=>row.date)
    const allSlots = rows.map(row => row.time);
    const available = rows.map(row => String(row.available)); 

    res.json({ date, allSlots, available });
    });
});

app.get("/getPatientInfo", (req, res) => {

    const { bookDate, slot } = req.query;
    const sql = `SELECT name, phone, reason, age FROM slots WHERE date = ? AND time = ?`;

    db.get(sql, [bookDate, slot], (err, row) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
        // no matching slot found
        return res.status(404).json({ error: 'No patient found for this slot' });
    }

    const name = row.name;
    const phone = row.phone;
    const age = row.age; 
    const reason = row.reason;
    res.json({name, phone, age, reason});
    });
});

app.post("/updateAvailability", (req, res) => {
    const { bookDate, slot, av, book_name, book_phone, book_reason, book_age  } = req.body;
    
    const sql = `UPDATE slots SET available = ?, name = ?, phone = ?, reason = ?, age = ? WHERE date = ? AND time = ?`;

    db.run(sql, [av, book_name, book_phone, book_reason, book_age, bookDate, slot], function (err) {
    if (err) {
        console.error(err.message);
        return res.status(500).send("Database error");
    }
    if (this.changes === 0) {
        return res.status(404).send("No matching record found");
    }
    res.send("Availability updated successfully");
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

function nextDates() {
    let dates = [];
    for (let i = 0; i <= 3; i++) {
        for (let j = 1; j <= 4; j++) {
            
            let nextDate = moment().tz("Asia/Kolkata").add(i, 'days');
            if (nextDate.day() !== 0) {                     // skip Sunday
                let nextDateIST = nextDate.format("D MMM YYYY"); 
                dates.push(nextDateIST);
            }
        }
    }
    return dates;
}

function setDB(){
    let dates = nextDates();
    let available = [1,1,1,1,
        1,1,1,1,
        1,1,1,1,
        1,1,1,1
    ];
    let time = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
        "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", 
        "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", 
        "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM"
    ];

    let stmt = db.prepare("INSERT OR REPLACE INTO slots (date, time, available) VALUES (?, ?, ?)");

    for (let i = 0; i < dates.length; i++) {
        stmt.run(dates[i], time[i], available[i]);
    }

    const todayStr = moment().tz("Asia/Kolkata").format("D MMM YYYY");

    db.run('DELETE FROM slots WHERE date < ?', [todayStr], err => {
        if (err) console.error('Error deleting past slots:', err);
        else console.log('Past slots removed');
    });

    stmt.finalize();
}

setDB();

app.get('/dates', (req, res) => {
    const dates = nextDates(); 
    res.json(dates); 
});


// ===========================================================


function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const uname = "admin";         
const hashpass = hashPassword('admin123');

app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;
    const pshash = hashPassword(password);

    db.get(
    "SELECT * FROM admin_users WHERE username = ? AND password_hash = ?",
    [username, pshash],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database error");
      }

      if (row) {
        // Login successful
        res.status(200).send("Login successful");
      } else {
        // Invalid username or password
        res.status(401).send("Invalid username or password");
      }
    }
  );
});
