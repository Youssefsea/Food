require('dotenv').config();
const express = require('express');
const app = express();
const router = require('../router');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// ✅ حذفنا: http, Server, setupChatSocket
// مش محتاجينهم لأن Pusher بيتكلف الـ real-time من جهته

app.use(cookieParser());

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

app.use('/', router);

module.exports = app;