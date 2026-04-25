require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const router = require('./router');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { setupChatSocket } = require('./chat/chatSocket');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

setupChatSocket(io);

app.use(cookieParser());

app.use(cors({
    origin: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true               
}));

app.use(express.json());

app.use('/', router);

// const port = process.env.PORT || 3444;
// server.listen(port, () => {
//     console.log(`Server is running at http://localhost:${port}`);
//     console.log(`Socket.IO is ready for connections`);
// });

module.exports=app;