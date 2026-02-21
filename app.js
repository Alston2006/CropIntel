// Core Module
const path = require('path');

// External Module
const express = require('express');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded());
app.use(express.static(path.join(rootDir, 'public')))