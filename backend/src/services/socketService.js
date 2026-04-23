/**
 * WebSocket Service - Handles real-time collaboration
 * Manages socket connections, room management, and event broadcasting
 */
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../models/Board.js';
import { Session } from '../models/Session.js';

export const handleSocketConnection = (socket, io) => {
  console.log(`📱 User connected: ${socket.id}`);

  /**
   * Join room event - User enters a whiteboard session
   * Payload: { boardId, userId, userName }
   */
  socket.on('join-room', async (payload) => {
    try {
      const { boardId, userId, userName } = payload;
      const roomKey = `board_${boardId}`;

      // Create session record
      const session = await Session.create({
        sessionId: socket.id,
        boardId,
        userId,
        userName,
        color: generateUserColor(),
        isActive: true
      });

      // Join socket room
      socket.join(roomKey);

      // Update room users map
      if (!global.roomUsers.has(roomKey)) {
        global.roomUsers.set(roomKey, new Set());
      }
      global.roomUsers.get(roomKey).add(socket.id);

      // Load board data
      const board = await Board.findOne({ id: boardId });
      if (!board) {
        socket.emit('error', { message: 'Board not found' });
        return;
      }

      // Send board data to joining user
      socket.emit('board-loaded', {
        id: board.id,
        name: board.name,
        data: board.data,
        version: board.currentVersion
      });

      // Notify others of user joining
      const roomUsers = await getActiveUsers(boardId);
      io.to(roomKey).emit('user-joined', {
        userId,
        userName,
        color: session.color,
        activeUsers: roomUsers
      });

      console.log(`✅ User ${userName} joined board ${boardId}`);
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  /**
   * Draw event - User draws/creates an object
   * Payload: { boardId, object }
   */
  socket.on('draw', async (payload) => {
    try {
      const { boardId, object } = payload;
      const roomKey = `board_${boardId}`;

      // Broadcast to all users in room (except sender)
      socket.to(roomKey).emit('draw', { object, userId: socket.id });

      // Update activity timestamp
      await Session.updateOne(
        { sessionId: socket.id },
        { lastActivity: new Date() }
      );
    } catch (error) {
      console.error('❌ Error broadcasting draw:', error);
    }
  });

  /**
   * Update object event - Modify existing object
   * Payload: { boardId, objectId, updates }
   */
  socket.on('update-object', async (payload) => {
    try {
      const { boardId, objectId, updates } = payload;
      const roomKey = `board_${boardId}`;

      socket.to(roomKey).emit('update-object', {
        objectId,
        updates,
        userId: socket.id
      });

      await Session.updateOne(
        { sessionId: socket.id },
        { lastActivity: new Date() }
      );
    } catch (error) {
      console.error('❌ Error updating object:', error);
    }
  });

  /**
   * Delete object event - Remove object from canvas
   */
  socket.on('delete-object', async (payload) => {
    try {
      const { boardId, objectId } = payload;
      const roomKey = `board_${boardId}`;

      socket.to(roomKey).emit('delete-object', { objectId });

      await Session.updateOne(
        { sessionId: socket.id },
        { lastActivity: new Date() }
      );
    } catch (error) {
      console.error('❌ Error deleting object:', error);
    }
  });

  /**
   * Save board event - Persist board state to database
   * Payload: { boardId, boardData, userId }
   */
  socket.on('save-board', async (payload) => {
    try {
      const { boardId, boardData, userId } = payload;
      const roomKey = `board_${boardId}`;

      const board = await Board.findOne({ id: boardId });
      if (!board) {
        socket.emit('error', { message: 'Board not found' });
        return;
      }

      board.data = boardData;
      board.updatedAt = new Date();
      board.currentVersion = (board.currentVersion || 0) + 1;

      // Add to version history
      board.versions.push({
        versionNumber: board.currentVersion,
        data: boardData,
        userId,
        changeDescription: 'Auto-save'
      });
      await board.save();

      // Notify all users
      io.to(roomKey).emit('board-saved', {
        timestamp: new Date(),
        version: board.currentVersion
      });

      console.log(`💾 Board ${boardId} saved`);
    } catch (error) {
      console.error('❌ Error saving board:', error);
      socket.emit('error', { message: 'Failed to save board' });
    }
  });

  /**
   * Cursor position event - Share user's cursor position
   */
  socket.on('cursor-move', async (payload) => {
    try {
      const { boardId, x, y } = payload;
      const roomKey = `board_${boardId}`;

      socket.to(roomKey).emit('cursor-move', {
        userId: socket.id,
        x,
        y
      });

      // Update session cursor
      await Session.updateOne(
        { sessionId: socket.id },
        { cursorX: x, cursorY: y }
      );
    } catch (error) {
      console.error('❌ Error updating cursor:', error);
    }
  });

  /**
   * Undo event - Notify others of undo action
   */
  socket.on('undo', (payload) => {
    try {
      const { boardId } = payload;
      const roomKey = `board_${boardId}`;

      socket.to(roomKey).emit('undo', { userId: socket.id });
    } catch (error) {
      console.error('❌ Error handling undo:', error);
    }
  });

  /**
   * Redo event
   */
  socket.on('redo', (payload) => {
    try {
      const { boardId } = payload;
      const roomKey = `board_${boardId}`;

      socket.to(roomKey).emit('redo', { userId: socket.id });
    } catch (error) {
      console.error('❌ Error handling redo:', error);
    }
  });

  /**
   * Disconnect event - Clean up when user leaves
   */
  socket.on('disconnect', async () => {
    try {
      const session = await Session.findOne({ sessionId: socket.id });
      
      if (session) {
        const roomKey = `board_${session.boardId}`;
        
        // Remove from room users set
        if (global.roomUsers.has(roomKey)) {
          global.roomUsers.get(roomKey).delete(socket.id);
        }

        // Delete session
        await Session.deleteOne({ sessionId: socket.id });

        // Notify remaining users
        const activeUsers = await getActiveUsers(session.boardId);
        io.to(roomKey).emit('user-left', {
          userId: session.userId,
          activeUsers
        });

        console.log(`❌ User disconnected: ${socket.id}`);
      }
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  });

  /**
   * Error event
   */
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
};

/**
 * Helper function - Get active users in a board
 */
async function getActiveUsers(boardId) {
  try {
    const sessions = await Session.find({
      boardId,
      isActive: true
    }).select('userId userName color');

    return sessions.map(s => ({
      userId: s.userId,
      userName: s.userName,
      color: s.color
    }));
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
}

/**
 * Helper function - Generate random color for user
 */
function generateUserColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
