const express = require('express');
const path = require('path');

const app = express();

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// static
app.use(express.static(path.join(__dirname, 'public')));

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// routes
const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes);

module.exports = app;