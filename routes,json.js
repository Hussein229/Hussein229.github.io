const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const fetchAndStoreReport = require('../utils');
const fs = require('fs');
const path = require('path');
const requestIp = require('request-ip');
const JWT_SECRET = 'your_secret_key';

router.get('/register', (req, res) => {
  res.render('register.html');
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Missing username or password");
  }
  try {
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).send("User already exists");
    }
    await db.createUser(username, password);
    res.status(200).send('User logged in!');
  } catch (err) {
    res.status(500).send("Registration error: " + err.message);
  }
});

router.get('/', (req, res) => {
  res.render('login.html');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Missing username or password");
  }
  try {
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(400).send("User does not exist");
    }
    if (user.password !== password) {
      return res.status(400).send("Invalid credentials");
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/challenge/dashboard');
  } catch (err) {
    res.status(500).send("Login error: " + err.message);
  }
});

function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];
  if (!token) {
    return res.redirect('/challenge/');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect('/challenge/');
  }
}

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    let reports = await db.getReportsByUserId(req.user.id);

    reports = reports.map(report => {
      if (report.findings && fs.existsSync(report.findings)) {
        try {
          const fileContent = fs.readFileSync(report.findings, 'utf8');
          report.findingsContent = fileContent.length > 200
            ? fileContent.slice(0, 1500) + "..."
            : fileContent;
        } catch (err) {
          report.findingsContent = "Error reading report content.";
        }
      } else {
        report.findingsContent = "No findings available.";
      }
      return report;
    });

    console.log(reports)

    res.render('dashboard.html', { username: req.user.username, reports });
  } catch (err) {
    res.status(500).send("Error fetching reports: " + err.message);
  }
});

router.get('/submit-report', authenticateToken, async (req, res) => {
  return res.render('submit-report.html');
})

router.post('/submit-report', authenticateToken, async (req, res) => {
  const { target_type, target } = req.body;
  if (!target_type || !target) {
    return res.status(400).send("Target type and target are required.");
  }

  let storedFilePath = "";
  try {
    storedFilePath = await fetchAndStoreReport(target);
  } catch (err) {
    return res.status(400).send("Error fetching target: " + err.message);
  }

  console.log(storedFilePath)

  try {
    await db.createReport(req.user.id, 'analyzing', 0, target, target_type, storedFilePath);
    res.status(200).send("Report submitted successfully.");
  } catch (err) {
    res.status(500).send("Error saving report: " + err.message);
  }
});

router.get('/incident-reports', async (req, res) => {
  const clientIp = req.ip;
  
  console.log("Client IP:", clientIp);
  
  if (clientIp !== "127.0.0.1" && clientIp !== "::ffff:127.0.0.1" && clientIp !== "::1") {
    return res.status(403).send("Forbidden");
  }
  
  try {
    const reports = await db.getAllReports();
    res.render('incident-reports.html', { reports });
  } catch (err) {
    res.status(500).send("Error fetching incident reports: " + err.message);
  }
});


router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/challenge/');
});


module.exports = router;
