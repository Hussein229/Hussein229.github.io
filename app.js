const express = require('express');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./db');
const routes = require('./routes/routes.js');

const app = express();

const env = nunjucks.configure('views', {
  autoescape: true,
  express: app
});

env.addFilter('b64encode', function(input) {
  if (typeof input !== 'string') {
    input = JSON.stringify(input);
  }
  return Buffer.from(input).toString('base64');
});

env.addFilter('tojson', function(obj) {
  return JSON.stringify(obj);
});

env.addFilter('date', function(date, format = 'medium', locale = 'en') {
  const d = new Date(date);
  if (format === 'medium') {
    return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return d.toString();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(express.static('public'));

app.set('trust proxy', 1);
app.use('/challenge/', routes);

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
