import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid'; // Importing uuid v4 function directly
import cors from 'cors'

const app = express();
const server = createServer(app);
const io = new Server(server,cors());



io.on('connection', (socket) => {
  console.log('New connection');

  // Generate a unique ID for the user
  const userId = uuidv4(); // Using uuid package to generate a unique ID

  // Emit the unique ID to the client
  socket.emit('userId', userId);

  // Listen for custom events
  socket.on('chat message', (msg) => {
    console.log('Message: ' + msg);
    io.emit('chat message', msg);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
