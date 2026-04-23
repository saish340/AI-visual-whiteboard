import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main Zustand store for application state
 * Manages: canvas state, drawing tools, collaboration, UI state
 */
export const useStore = create((set, get) => ({
  // User state
  userId: localStorage.getItem('userId') || uuidv4(),
  userName: localStorage.getItem('userName') || `User-${Math.random().toString(36).substr(2, 5)}`,
  
  // Board state
  boardId: null,
  boardName: 'Untitled Board',
  boardData: {
    objects: [],
    connections: []
  },

  // Drawing tools state
  selectedTool: 'pen', // pen, rectangle, circle, arrow, text, eraser, select
  selectedColor: '#000000',
  selectedStrokeWidth: 2,
  selectedFontSize: 16,

  // Canvas state
  canvasWidth: 1200,
  canvasHeight: 800,
  zoomLevel: 1,
  panX: 0,
  panY: 0,

  // History state (Undo/Redo)
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,

  // UI state
  showToolbar: true,
  showSidebar: true,
  selectedObject: null,
  isDrawing: false,
  showAISuggestions: false,
  showContextPanel: false,

  // Collaboration state
  activeUsers: [],
  cursorPositions: {},

  // Loading & status
  isLoading: false,
  error: null,
  lastSaveTime: null,

  // Actions
  setUserId: (userId) => {
    localStorage.setItem('userId', userId);
    set({ userId });
  },
  setUserName: (userName) => {
    localStorage.setItem('userName', userName);
    set({ userName });
  },
  setBoardId: (boardId) => set({ boardId }),
  setBoardName: (boardName) => set({ boardName }),
  setBoardData: (boardData) => set({ boardData }),
  
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedStrokeWidth: (width) => set({ selectedStrokeWidth: width }),
  setSelectedFontSize: (size) => set({ selectedFontSize: size }),

  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.1, Math.min(5, zoomLevel)) }),
  setPanX: (panX) => set({ panX }),
  setPanY: (panY) => set({ panY }),
  pan: (deltaX, deltaY) => {
    const state = get();
    set({
      panX: state.panX + deltaX,
      panY: state.panY + deltaY
    });
  },

  setSelectedObject: (objectId) => set({ selectedObject: objectId }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setShowAISuggestions: (show) => set({ showAISuggestions: show }),
  setShowContextPanel: (show) => set({ showContextPanel: show }),

  setActiveUsers: (users) => set({ activeUsers: users }),
  setCursorPosition: (userId, x, y) => {
    const state = get();
    set({
      cursorPositions: {
        ...state.cursorPositions,
        [userId]: { x, y }
      }
    });
  },

  setError: (error) => set({ error }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setLastSaveTime: (time) => set({ lastSaveTime: time }),

  // Canvas manipulation actions
  addObject: (object) => {
    const state = get();
    const savedObject = { id: object.id || uuidv4(), ...object };
    const newObjects = [...state.boardData.objects, savedObject];
    set({
      boardData: {
        ...state.boardData,
        objects: newObjects
      }
    });
    get().pushHistory();
    return savedObject;
  },

  updateObject: (objectId, updates) => {
    const state = get();
    const newObjects = state.boardData.objects.map(obj =>
      obj.id === objectId ? { ...obj, ...updates } : obj
    );
    set({
      boardData: {
        ...state.boardData,
        objects: newObjects
      }
    });
    get().pushHistory();
  },

  deleteObject: (objectId) => {
    const state = get();
    const newObjects = state.boardData.objects.filter(obj => obj.id !== objectId);
    const newConnections = state.boardData.connections.filter(
      conn => conn.fromId !== objectId && conn.toId !== objectId
    );
    set({
      boardData: {
        ...state.boardData,
        objects: newObjects,
        connections: newConnections
      }
    });
    get().pushHistory();
  },

  addConnection: (fromId, toId, type = 'line', label = '') => {
    const state = get();
    const newConnections = [
      ...state.boardData.connections,
      { id: uuidv4(), fromId, toId, type, label }
    ];
    set({
      boardData: {
        ...state.boardData,
        connections: newConnections
      }
    });
    get().pushHistory();
  },

  deleteConnection: (connectionId) => {
    const state = get();
    const newConnections = state.boardData.connections.filter(
      conn => conn.id !== connectionId
    );
    set({
      boardData: {
        ...state.boardData,
        connections: newConnections
      }
    });
  },

  updateMetadata: (objectId, metadata) => {
    const state = get();
    const newObjects = state.boardData.objects.map(obj =>
      obj.id === objectId ? { ...obj, metadata: { ...obj.metadata, ...metadata } } : obj
    );
    set({
      boardData: {
        ...state.boardData,
        objects: newObjects
      }
    });
  },

  // History management
  pushHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    
    if (newHistory.length >= state.maxHistorySize) {
      newHistory.shift();
    }
    
    newHistory.push(JSON.parse(JSON.stringify(state.boardData)));
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        boardData: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        boardData: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex
      });
    }
  },

  // Utility actions
  clearBoard: () => {
    set({
      boardData: { objects: [], connections: [] },
      selectedObject: null,
      history: [],
      historyIndex: -1
    });
  },

  resetZoomAndPan: () => {
    set({
      zoomLevel: 1,
      panX: 0,
      panY: 0
    });
  }
}));
