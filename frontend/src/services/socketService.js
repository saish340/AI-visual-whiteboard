/**
 * WebSocket service for real-time collaboration
 */
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

let socket = null;

export const initializeSocket = (userId, boardId, userName) => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  socket = io(apiUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Join room
    socket.emit('join-room', { boardId, userId, userName });
  });

  // Receive full board state
  socket.on('board-loaded', (data) => {
    useStore.setState({
      boardId: data.id,
      boardName: data.name,
      boardData: data.data,
      history: [JSON.parse(JSON.stringify(data.data))],
      historyIndex: 0
    });
  });

  // Handle draw events from other users
  socket.on('draw', (data) => {
    const { object } = data;
    useStore.getState().addObject(object);
  });

  // Handle object updates
  socket.on('update-object', (data) => {
    const { objectId, updates } = data;
    useStore.getState().updateObject(objectId, updates);
  });

  // Handle object deletion
  socket.on('delete-object', (data) => {
    const { objectId } = data;
    useStore.getState().deleteObject(objectId);
  });

  // Handle board saved
  socket.on('board-saved', (data) => {
    useStore.setState({
      lastSaveTime: new Date(data.timestamp)
    });
  });

  // Handle cursor movements
  socket.on('cursor-move', (data) => {
    const { userId, x, y } = data;
    useStore.getState().setCursorPosition(userId, x, y);
  });

  // Handle user join
  socket.on('user-joined', (data) => {
    useStore.setState({ activeUsers: data.activeUsers });
    console.log(`👤 ${data.userName} joined`);
  });

  // Handle user leave
  socket.on('user-left', (data) => {
    useStore.setState({ activeUsers: data.activeUsers });
  });

  // Handle undo/redo from other users
  socket.on('undo', (data) => {
    // Note: In production, you'd sync the full state instead of local undo
    console.log(`↶ ${data.userId} performed undo`);
  });

  socket.on('redo', (data) => {
    console.log(`↷ ${data.userId} performed redo`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
    useStore.setState({ error: error.message });
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
  });

  return socket;
};

export const getSocket = () => socket;

export const emitDraw = (boardId, object) => {
  if (socket) {
    socket.emit('draw', { boardId, object });
  }
};

export const emitUpdateObject = (boardId, objectId, updates) => {
  if (socket) {
    socket.emit('update-object', { boardId, objectId, updates });
  }
};

export const emitDeleteObject = (boardId, objectId) => {
  if (socket) {
    socket.emit('delete-object', { boardId, objectId });
  }
};

export const emitSaveBoard = (boardId, boardData, userId) => {
  if (socket) {
    socket.emit('save-board', { boardId, boardData, userId });
  }
};

export const emitCursorMove = (boardId, x, y) => {
  if (socket) {
    socket.emit('cursor-move', { boardId, x, y });
  }
};

export const emitUndo = (boardId) => {
  if (socket) {
    socket.emit('undo', { boardId });
  }
};

export const emitRedo = (boardId) => {
  if (socket) {
    socket.emit('redo', { boardId });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
