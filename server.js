import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import mysql from 'mysql2';
import { config } from 'dotenv';

config();

const app = express();
const server = createServer(app);

app.use(cors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'my-custom-header'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'my-custom-header'],
    credentials: true
  },
  path: '/chat'
});

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
}).promise();

io.on('connection', async (socket) => {
  console.log('New connection');

  let userId = uuidv4();
  socket.id = userId; // Assign the generated UUID as the socket's id

  socket.emit('userId', userId);

  socket.on('chat message', async ({ content }) => {
    try {
      await pool.query('INSERT INTO messages (content) VALUES (?)', [content]);
      io.to(socket.id).emit('chat message', { content }); // Directly emit to the sender
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
