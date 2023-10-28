const dotenv = require('dotenv');
const express = require('express');
const http = require('http');
const logger = require('morgan');
const path = require('path');
const router = require('./routes/index');
const { auth } = require('express-openid-connect');
const pgp = require('pg-promise')();

dotenv.config();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const config = {
  authRequired: false,
  auth0Logout: true
};

const port = process.env.PORT || 3000;
if (!config.baseURL && !process.env.BASE_URL && process.env.PORT && process.env.NODE_ENV !== 'production') {
  config.baseURL = `http://localhost:${port}`;
}

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) {
  res.locals.user = req.oidc.user;
  next();
});

app.use('/', router);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handlers
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

const db = pgp({connectionString: process.env.DATABASE_URL,
                ssl: {rejectUnauthorized: false}});


db.none('CREATE TABLE IF NOT EXISTS competitions ( id serial PRIMARY KEY, competition_name VARCHAR(255) NOT NULL, win INTEGER, loss INTEGER, draw INTEGER, email TEXT)')
  .then(() => {
    console.log('Table competitions created successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });

db.none('CREATE TABLE IF NOT EXISTS participants ( id serial PRIMARY KEY, participant_name VARCHAR(255) NOT NULL, competition_id INT REFERENCES competitions(id), score INT)')
  .then(() => {
    console.log('Table created successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });

db.none('CREATE TABLE IF NOT EXISTS scores ( id serial PRIMARY KEY, participant1_id INT REFERENCES participants(id), participant2_id INT REFERENCES participants(id), competition_id INT REFERENCES competitions(id), round INT, participantwin_id INT REFERENCES participants(id))')
  .then(() => {
    console.log('Table created successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });
/*
db.none('DROP TABLE IF EXISTS scores')
  .then(() => {
    console.log('Table scores deleted successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });

db.none('DROP TABLE IF EXISTS participants')
  .then(() => {
    console.log('Table participants deleted successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });

db.none('DROP TABLE IF EXISTS competitions')
  .then(() => {
    console.log('Table competitions deleted successfully.');
  })
  .catch(error => {
    console.log('ERROR:', error);
  });
*/
    http.createServer(app)
    .listen(port, () => {
      console.log(`Listening on ${config.baseURL}`);
    });
