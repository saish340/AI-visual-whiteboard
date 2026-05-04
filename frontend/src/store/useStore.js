import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  cleanupBoardData,
  createConnectionFromArrow,
  extractSemanticGraph,
  generateArchitectureMarkdown,
  normalizeBoardData,
  searchContextEntries
} from '../utils/boardGraph';
import {
  mergeTemplateIntoBoardData
} from '../utils/boardFeatures';

/**
 * Main Zustand store for application state
 * Manages: canvas state, drawing tools, collaboration, UI state
 */
export const useStore = create((set, get) => ({
  // User state
  userId: localStorage.getItem('userId') || uuidv4(),
  userName: localStorage.getItem('userName') || `User-${Math.random().toString(36).substr(2, 5)}`,
  isDarkMode: JSON.parse(localStorage.getItem('darkMode') || 'false'),
  
  // Board state
  boardId: null,
  boardName: 'Untitled Board',
  boardIsPublic: false,
  boardData: normalizeBoardData({
    objects: [],
    connections: []
  }),
  semanticGraph: {
    components: [],
    connections: [],
    clusters: [],
    context: []
  },
  contextQuery: '',
  contextFilter: {
    tag: '',
    elementId: ''
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
  showBoardHub: false,
  selectedObject: null,
  isDrawing: false,
  showAISuggestions: false,
  showContextPanel: false,

  // Collaboration state
  activeUsers: [],
  cursorPositions: {},
  activityFeed: [],

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
  setDarkMode: (isDarkMode) => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    set({ isDarkMode });
  },
  setBoardId: (boardId) => set({ boardId }),
  setBoardName: (boardName) => set({ boardName }),
  setBoardIsPublic: (boardIsPublic) => set({ boardIsPublic: !!boardIsPublic }),
  setBoardData: (boardData) => {
    const normalized = normalizeBoardData(boardData);
    set({
      boardData: normalized,
      semanticGraph: extractSemanticGraph(normalized)
    });
  },
  setShowBoardHub: (showBoardHub) => set({ showBoardHub: !!showBoardHub }),
  setContextQuery: (contextQuery) => set({ contextQuery }),
  setContextFilter: (contextFilter) => set({ contextFilter }),
  
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
  logActivity: (entry) => {
    const nextEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...entry
    };
    set((state) => ({
      activityFeed: [nextEntry, ...state.activityFeed].slice(0, 25)
    }));
    return nextEntry;
  },

  refreshSemanticGraph: () => {
    const state = get();
    const normalized = normalizeBoardData(state.boardData);
    set({ semanticGraph: extractSemanticGraph(normalized) });
  },

  applyBoardPatch: (patch = {}, options = {}) => {
    const state = get();
    const normalized = normalizeBoardData(state.boardData);
    const nextObjects = [...normalized.objects];
    const nextConnections = [...normalized.connections];

    if (Array.isArray(patch.objects)) {
      patch.objects.forEach((object) => {
        const index = nextObjects.findIndex((entry) => entry.id === object.id);
        const nextObject = { ...(index >= 0 ? nextObjects[index] : {}), ...object };
        if (index >= 0) {
          nextObjects[index] = nextObject;
        } else {
          nextObjects.push(nextObject);
        }

        if (nextObject.type === 'arrow') {
          const connection = createConnectionFromArrow(nextObject, nextObjects);
          const connectionIndex = nextConnections.findIndex((entry) => entry.id === connection.id);
          if (connectionIndex >= 0) {
            nextConnections[connectionIndex] = connection;
          } else {
            nextConnections.push(connection);
          }
        }
      });
    }

    if (Array.isArray(patch.connections)) {
      patch.connections.forEach((connection) => {
        const index = nextConnections.findIndex((entry) => entry.id === connection.id);
        const nextConnection = { ...(index >= 0 ? nextConnections[index] : {}), ...connection };
        if (index >= 0) {
          nextConnections[index] = nextConnection;
        } else {
          nextConnections.push(nextConnection);
        }
      });
    }

    if (Array.isArray(patch.removeObjectIds)) {
      patch.removeObjectIds.forEach((objectId) => {
        const objectIndex = nextObjects.findIndex((entry) => entry.id === objectId);
        if (objectIndex >= 0) nextObjects.splice(objectIndex, 1);
      });

      for (let index = nextConnections.length - 1; index >= 0; index -= 1) {
        const connection = nextConnections[index];
        if (
          patch.removeObjectIds.includes(connection.sourceId) ||
          patch.removeObjectIds.includes(connection.targetId) ||
          patch.removeObjectIds.includes(connection.id)
        ) {
          nextConnections.splice(index, 1);
        }
      }
    }

    const nextBoardData = normalizeBoardData({
      ...normalized,
      objects: nextObjects,
      connections: nextConnections
    });

    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });

    if (options.pushHistory !== false) {
      get().pushHistory();
    }

    return nextBoardData;
  },

  // Canvas manipulation actions
  addObject: (object) => {
    const state = get();
    const savedObject = {
      ...object,
      id: object.id || uuidv4(),
      rev: Number.isFinite(object.rev) ? object.rev : 0,
      updatedAt: Date.now(),
      metadata: {
        notes: '',
        code: '',
        links: [],
        tags: [],
        ...(object.metadata || {})
      }
    };

    const boardData = normalizeBoardData({
      ...state.boardData,
      objects: [...state.boardData.objects, savedObject]
    });

    if (savedObject.type === 'arrow') {
      const connection = createConnectionFromArrow(savedObject, boardData.objects);
      boardData.connections = [...boardData.connections.filter((entry) => entry.id !== connection.id), connection];
    }

    set({
      boardData,
      semanticGraph: extractSemanticGraph(boardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'create',
      title: 'Added object',
      detail: savedObject.text || savedObject.kind || savedObject.type
    });
    return savedObject;
  },

  updateObject: (objectId, updates) => {
    const state = get();
    const newObjects = state.boardData.objects.map((obj) =>
      obj.id === objectId ? { ...obj, ...updates, rev: (obj.rev || 0) + 1, updatedAt: Date.now() } : obj
    );

    const updatedObject = newObjects.find((obj) => obj.id === objectId);
    const nextConnections = [...state.boardData.connections];

    if (updatedObject?.type === 'arrow') {
      const connection = createConnectionFromArrow(updatedObject, newObjects);
      const index = nextConnections.findIndex((entry) => entry.id === connection.id);
      if (index >= 0) {
        nextConnections[index] = connection;
      } else {
        nextConnections.push(connection);
      }
    }

    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      objects: newObjects,
      connections: nextConnections
    });

    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'update',
      title: 'Updated object',
      detail: updatedObject?.text || updatedObject?.kind || objectId
    });
  },

  deleteObject: (objectId) => {
    const state = get();
    const newObjects = state.boardData.objects.filter((obj) => obj.id !== objectId);
    const newConnections = state.boardData.connections.filter((conn) =>
      conn.id !== objectId && conn.sourceId !== objectId && conn.targetId !== objectId && conn.fromId !== objectId && conn.toId !== objectId
    );
    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      objects: newObjects,
      connections: newConnections
    });
    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'delete',
      title: 'Deleted object',
      detail: objectId
    });
  },

  addConnection: (fromId, toId, type = 'line', label = '') => {
    const state = get();
    const connection = {
      id: uuidv4(),
      sourceId: fromId,
      targetId: toId,
      type,
      label,
      rev: 0,
      updatedAt: Date.now()
    };
    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      connections: [...state.boardData.connections, connection]
    });
    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'create',
      title: 'Added connection',
      detail: `${fromId} -> ${toId}`
    });
    return connection;
  },

  deleteConnection: (connectionId) => {
    const state = get();
    const newConnections = state.boardData.connections.filter((conn) => conn.id !== connectionId);
    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      connections: newConnections
    });
    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
  },

  updateMetadata: (objectId, metadata) => {
    const state = get();
    const newObjects = state.boardData.objects.map((obj) =>
      obj.id === objectId ? { ...obj, metadata: { ...obj.metadata, ...metadata }, rev: (obj.rev || 0) + 1, updatedAt: Date.now() } : obj
    );
    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      objects: newObjects
    });
    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'comment',
      title: 'Updated metadata',
      detail: objectId
    });
  },

  addComment: (objectId, comment) => {
    const state = get();
    const newObjects = state.boardData.objects.map((obj) => {
      if (obj.id !== objectId) return obj;

      const comments = Array.isArray(obj.metadata?.comments) ? obj.metadata.comments : [];
      return {
        ...obj,
        metadata: {
          ...obj.metadata,
          comments: [...comments, {
            id: uuidv4(),
            userId: comment.userId,
            userName: comment.userName,
            text: comment.text,
            createdAt: comment.createdAt || new Date().toISOString()
          }]
        },
        rev: (obj.rev || 0) + 1,
        updatedAt: Date.now()
      };
    });

    const nextBoardData = normalizeBoardData({
      ...state.boardData,
      objects: newObjects
    });

    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'comment',
      title: 'Added comment',
      detail: comment.text
    });
  },

  insertTemplate: (templateId) => {
    const state = get();
    const templatePatch = mergeTemplateIntoBoardData(state.boardData, templateId);
    const nextBoardData = normalizeBoardData(templatePatch);

    set({
      boardData: nextBoardData,
      semanticGraph: extractSemanticGraph(nextBoardData)
    });
    get().pushHistory();
    get().logActivity({
      type: 'template',
      title: 'Inserted template',
      detail: templateId
    });

    return nextBoardData;
  },

  importBoardData: (boardData, boardName = null) => {
    const normalized = normalizeBoardData(boardData);
    set({
      boardData: normalized,
      boardName: boardName || boardData.name || 'Imported Board',
      semanticGraph: extractSemanticGraph(normalized)
    });
    get().pushHistory();
    get().logActivity({
      type: 'import',
      title: 'Imported board',
      detail: boardName || boardData.name || 'Imported board'
    });
    return normalized;
  },

  cleanupBoard: () => {
    const state = get();
    const cleaned = cleanupBoardData(state.boardData);
    set({
      boardData: cleaned,
      semanticGraph: extractSemanticGraph(cleaned)
    });
    get().pushHistory();
    get().logActivity({
      type: 'layout',
      title: 'Cleaned up board layout',
      detail: `${cleaned.objects.length} objects`
    });
    return cleaned;
  },

  generateArchitectureDocument: () => generateArchitectureMarkdown(get().boardData),

  getFilteredContextEntries: () => {
    const state = get();
    return searchContextEntries(state.boardData, state.contextQuery, state.contextFilter);
  },

  // History management
  pushHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    
    if (newHistory.length >= state.maxHistorySize) {
      newHistory.shift();
    }
    
    newHistory.push(JSON.parse(JSON.stringify(normalizeBoardData(state.boardData))));
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const boardData = normalizeBoardData(JSON.parse(JSON.stringify(state.history[newIndex])));
      set({
        boardData,
        semanticGraph: extractSemanticGraph(boardData),
        historyIndex: newIndex
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const boardData = normalizeBoardData(JSON.parse(JSON.stringify(state.history[newIndex])));
      set({
        boardData,
        semanticGraph: extractSemanticGraph(boardData),
        historyIndex: newIndex
      });
    }
  },

  // Utility actions
  clearBoard: () => {
    const boardData = normalizeBoardData({ objects: [], connections: [] });
    set({
      boardData,
      semanticGraph: extractSemanticGraph(boardData),
      selectedObject: null,
      history: [],
      historyIndex: -1,
      activityFeed: []
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
