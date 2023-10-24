const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pgp = require('pg-promise')();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const db = pgp({connectionString: process.env.DATABASE_URL,
                ssl: {rejectUnauthorized: false}});

db.none('CREATE TABLE IF NOT EXISTS natjecanje ( id serial PRIMARY KEY, naziv_natjecanja TEXT, pobjeda INTEGER, poraz INTEGER, remi INTEGER, osnivac TEXT)')
  .then(() => {
    console.log('stvorena tablica');
  })
  .catch(() => {
    console.error('Error executing query:');
  });

/*db.one('INSERT INTO natjecanje(id, naziv_natjecanja, pobjeda, poraz, remi, osnivac) VALUES($1, $2, $3, $4, $5, $6) RETURNING id', [1, 'Nogomet', 3, 1, 0, 'user'])
  .then(data => {
      console.log(data.id); // print new user id;
  })
  .catch(error => {
      console.log('ERROR:', error); // print error;
  });*/

db.one('SELECT * FROM natjecanje')
  .then(data => {
    console.log('Data:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

app.use(bodyParser.json());

// Define your routes and database logic here...
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      // Store username and hashedPassword in the database
      // ...
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Retrieve hashedPassword from the database based on the username
        // Compare the hashedPassword with the provided password using bcrypt.compare
        // ...
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Invalid credentials' });
    }
    });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
      filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
  };

  const contentTypeHeader = contentType[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
      if (err) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('404 Not Found');
      } else {
          res.writeHead(200, { 'Content-Type': contentTypeHeader });
          res.end(content, 'utf-8');
      }
  });
});

const WEBPORT = 80;

server.listen(WEBPORT, () => {
  console.log(`Server running at http://127.0.0.1:${WEBPORT}/`);
});