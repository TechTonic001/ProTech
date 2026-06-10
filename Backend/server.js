// server.js
require('dotenv').config();
const express = require('express');

// Import the DB module so it executes its connection test on startup
require('./config/db');

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Welcome Route for the Root URL
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Welcome to the ProTech API!",
        status: "Running smoothly 🚀"
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server is currently rununing on ${PORT}`);

})

