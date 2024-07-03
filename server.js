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
  origin: 'http://localhost:8080', // Replace with your frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['my-custom-header'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true
  }
});

// Initialize MySQL connection pool
const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
}).promise();

io.on('connection', async (socket) => {
  console.log('New connection');

  // Generate a unique user ID using UUIDv4
  let userId = uuidv4();

  // Emit the unique ID to the client
  socket.emit('userId', userId);

  // Listen for chat messages
  socket.on('chat message', async ({ content, userId }) => {
    try {
      await pool.query('INSERT INTO messages (content, user_id) VALUES (?,?)', [content, userId]);
      io.emit('chat message', { content, userId }); // Broadcast the message
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
