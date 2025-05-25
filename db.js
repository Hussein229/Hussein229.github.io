const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs'); // Added to read /flag.txt
const crypto = require('crypto');
const dbPath = path.resolve(__dirname, 'database.sqlite');


const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database.");
    
    // Use serialize to run SQL statements sequentially.
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )`);
    
      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        status TEXT,
        risk_score INTEGER,
        target_url TEXT,
        target_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        findings TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, (err) => {
        if (err) {
          console.error("Error creating reports table:", err);
        } else {
          // Call seedReports() only after tables are created
          seedReports();
        }
      });
    });
  }
});
function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser(username, password) {
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getReportsByUserId(userId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM reports WHERE user_id = ?", [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function createReport(user_id, status, risk_score, target_url, target_type, findings) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO reports (user_id, status, risk_score, target_url, target_type, findings)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, status, risk_score, target_url, target_type, findings],
      function (err) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function getAllReports() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM reports", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function seedReports() {
  db.get("SELECT * FROM reports WHERE target_url = ?", ["http://example.com/flag"], (err, row) => {
    if (err) {
      console.error("Error checking for flag report:", err);
      return;
    }
    if (row) {
      console.log("Report already seeded. Skipping seeding process.");
      return;
    }

    db.get("SELECT * FROM users WHERE username = ?", ['admin'], (err, adminRow) => {
      if (err) {
        console.error("Error checking for admin user:", err);
      } else if (!adminRow) {
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin@phoenix.htb', crypto.randomBytes(48).toString('base64url')], function (err) {
          if (err) {
            console.error("Error creating admin user:", err);
          } else {
            insertFlagReport(this.lastID);
          }
        });
      } else {
        insertFlagReport(adminRow.id, flagContent);
      }
    });
  });
}


function insertFlagReport(userId) {
  db.run(
    "INSERT INTO reports (user_id, status, risk_score, target_url, target_type, findings) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, "completed", 100, "http://example.com/flag", "url", "HTB{FAKE_FLAG_FOR_TESTING}"],
    function (err) {
      if (err) {
        console.error("Error seeding flag report:", err);
      } else {
        console.log("Seeded flag report with id", this.lastID);
      }
    }
  );
}


module.exports = {
  getAllReports,
  getUserByUsername,
  createUser,
  getReportsByUserId,
  createReport,
  seedReports
};
