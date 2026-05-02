/**
 * WebSocket service for real-time collaboration
 */
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { normalizeBoardData } from '../utils/boardGraph';

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
    const boardData = normalizeBoardData(data.data);
    useStore.setState({
      boardId: data.id,
      boardName: data.name,
      boardData,
      semanticGraph: useStore.getState().semanticGraph,
      history: [JSON.parse(JSON.stringify(boardData))],
      historyIndex: 0
    });
    useStore.getState().refreshSemanticGraph();
  });

  // Handle draw events from other users
  socket.on('draw', (data) => {
    const { object } = data;
    useStore.getState().applyBoardPatch({ objects: [object] }, { pushHistory: false });
  });

  // Handle object updates
  socket.on('update-object', (data) => {
    const { objectId, updates } = data;
    useStore.getState().applyBoardPatch({ objects: [{ id: objectId, ...updates }] }, { pushHistory: false });
  });

  // Handle object deletion
  socket.on('delete-object', (data) => {
    const { objectId } = data;
    useStore.getState().applyBoardPatch({ removeObjectIds: [objectId] }, { pushHistory: false });
  });

  socket.on('board-patch', (data) => {
    const { patch } = data;
    if (!patch) return;
    useStore.getState().applyBoardPatch(patch, { pushHistory: false });
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

export const emitBoardPatch = (boardId, patch) => {
  if (socket) {
    socket.emit('board-patch', { boardId, patch });
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
