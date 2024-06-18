import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid'; // Importing uuid v4 function directly
import cors from 'cors'
import mysql from 'mysql2';
import { config } from 'dotenv';
config();


const app = express();
const server = createServer(app);
const io = new Server(server,cors());



const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
}).promise()


io.on('connection', async (socket) => {
  console.log('New connection');

  // Generate a unique user ID
  let userId = await generateUserId(socket);

  // Check if the generated ID is unique
  while (true) {
    const [rows] = await pool.query('SELECT * as count FROM messages WHERE user_id =?', [userId]);
    if (rows[0].count === 0) break; // If the ID doesn't exist, exit the loop
    userId = await generateUserId(socket); // Regenerate the ID if it's not unique
  }

  // Emit the unique ID to the client
  socket.emit('userId', userId);

  // Listen for chat messages
  socket.on('chat message', async ({ content, userId }) => {
    try {
      await db.query('INSERT INTO messages (content, user_id) VALUES (?,?)', [content, userId]);
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

async function generateUserId() {
  const userIdLength = 10;
  let randomUserId = generateRandomString(userIdLength);

  // Check if the generated ID is unique
  while (true) {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM messages WHERE user_id = ?', [randomUserId]);
      if (rows[0].count === 0) break; // If the ID doesn't exist, exit the loop
      randomUserId = generateRandomString(userIdLength); // Regenerate the ID if it's not unique
  }

  return Promise.resolve(randomUserId);
}

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
