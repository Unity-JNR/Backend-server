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
  origin: 'https://chat-sable-nu.vercel.app/',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'my-custom-header'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: 'https://chat-sable-nu.vercel.app/',
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


/*
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS config
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://chat-sable-nu.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://chat-sable-nu.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/chat'
});

// Connect to MySQL
const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

// Ensure tables exist
const initializeTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) UNIQUE,
      username VARCHAR(255) UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content TEXT NOT NULL,
      user_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
initializeTables();

// Guest name generator
const createGuest = () => {
  const id = uuidv4();
  return {
    userId: id,
    username: `Guest-${id.slice(0, 6)}`
  };
};

io.on('connection', (socket) => {
  console.log('🔌 New client connected');

  // Handle user registration
  socket.on('register', async (preferredUsername) => {
    try {
      let user;
      if (preferredUsername) {
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE username = ?',
          [preferredUsername]
        );

        if (rows.length > 0) {
          socket.emit('register-failed', 'Username already taken');
          return;
        }

        const userId = uuidv4();
        await pool.query(
          'INSERT INTO users (user_id, username) VALUES (?, ?)',
          [userId, preferredUsername]
        );
        user = { userId, username: preferredUsername };
      } else {
        user = createGuest();
        await pool.query(
          'INSERT INTO users (user_id, username) VALUES (?, ?)',
          [user.userId, user.username]
        );
      }

      socket.data.user = user;
      socket.emit('register-success', user);

      // Send previous messages
      const [messages] = await pool.query(`
        SELECT m.content, u.username, m.created_at
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.user_id
        ORDER BY m.created_at ASC
      `);

      socket.emit('chat-history', messages);

      console.log(`✅ Registered: ${user.username}`);
    } catch (err) {
      console.error('❌ Registration error:', err.message);
      socket.emit('register-failed', 'Something went wrong');
    }
  });

  // Handle incoming message
  socket.on('send-message', async (content) => {
    const user = socket.data.user;
    if (!user) {
      socket.emit('unauthorized', 'User not registered');
      return;
    }

    try {
      await pool.query(
        'INSERT INTO messages (content, user_id) VALUES (?, ?)',
        [content, user.userId]
      );

      const messageData = {
        content,
        username: user.username,
        created_at: new Date()
      };

      io.emit('new-message', messageData);
    } catch (err) {
      console.error('❌ Message error:', err.message);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected');
  });
});

// Clear messages every 2 hours
const clearMessages = async () => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM messages');
    if (rows[0].count > 0) {
      await pool.query('TRUNCATE TABLE messages');
      console.log('🧹 Messages table truncated');
    }
  } catch (err) {
    console.error('❌ Error truncating messages:', err.message);
  }
};
setInterval(clearMessages, 1000 * 60 * 60 * 2); // Every 2 hours

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
 */