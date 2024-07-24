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

io.on('connection', (socket) => {
  console.log('New connection');

  let userId = uuidv4();
  socket.emit('userId', userId);

  socket.on('chat message', async ({ content }) => {
    try {
      await pool.query('INSERT INTO messages (content, user_id) VALUES (?, ?)', [content, userId]);
      io.emit('chat message', { content, userId }); // Emit to all connected clients
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Function to truncate the messages table
const truncateMessagesTable = async () => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM messages');
    const count = rows[0].count;

    if (count > 0) {
      await pool.query('TRUNCATE TABLE messages');
      console.log('Messages table truncated');
    } else {
      console.log('Messages table is already empty');
    }
  } catch (error) {
    console.error('Error truncating messages table:', error);
  }
};


// Set interval to truncate the messages table every 2 hours (2 hours = 7200000 milliseconds)
setInterval(truncateMessagesTable, 7200000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
