const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
