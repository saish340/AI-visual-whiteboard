import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { initializeSocket, disconnectSocket, emitSaveBoard } from '../services/socketService';
import { boardApi } from '../services/apiService';
import Canvas from './Canvas';
import ToolBar from './ToolBar';
import AISuggestions from './AISuggestions';
import ContextPanel from './ContextPanel';
import ActiveUsers from './ActiveUsers';
import BoardHub from './BoardHub';
import './WhiteboardPage.css';

/**
 * Main Whiteboard Page Component
 */
const WhiteboardPage = ({ isDarkMode, toggleDarkMode }) => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const {
    userId,
    userName,
    boardData,
    setBoardId,
    setBoardName,
    setBoardIsPublic,
    setBoardData,
    setError,
    setLastSaveTime
  } = store;
  const [isLoading, setIsLoading] = useState(true);

  // Load board and initialize WebSocket
  useEffect(() => {
    const initBoard = async () => {
      try {
        setIsLoading(true);

        // Load board data
        if (boardId) {
          const response = await boardApi.getById(boardId);
          if (response.success) {
            setBoardId(response.data.id);
            setBoardName(response.data.name);
            setBoardIsPublic(response.data.isPublic);
            setBoardData(response.data.data);
          }
        }

        // Initialize WebSocket
        initializeSocket(userId, boardId, userName);

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading board:', error);
        setBoardId(boardId || `local-${Date.now()}`);
        setBoardName('Local Draft Board');
        setBoardData({ objects: [], connections: [] });
        setError(null);
        setIsLoading(false);
      }
    };

    initBoard();

    return () => {
      disconnectSocket();
    };
  }, [boardId, userId, userName, setBoardId, setBoardName, setBoardIsPublic, setBoardData, setError]);

  // Set up auto-save
  useEffect(() => {
    if (!boardId) return;

    const interval = setInterval(() => {
      emitSaveBoard(boardId, boardData, userId);
      setLastSaveTime(new Date());
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [boardId, boardData, userId, setLastSaveTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        emitSaveBoard(boardId, boardData, userId);
        setLastSaveTime(new Date());
      }

      // Ctrl/Cmd + E to export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        // Export functionality
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardId, boardData, userId, setLastSaveTime]);

  if (isLoading) {
    return (
      <div className="whiteboard-page loading">
        <div className="loader">Loading board...</div>
      </div>
    );
  }

  return (
    <div className={`whiteboard-page ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="whiteboard-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="board-title">{store.boardName}</h1>
        </div>
        <div className="header-right">
          <ActiveUsers users={store.activeUsers} />
          <button
            className="board-hub-toggle"
            onClick={() => store.setShowBoardHub(true)}
            title="Open board hub"
          >
            Board Hub
          </button>
          <button
            className="dark-mode-toggle"
            onClick={toggleDarkMode}
            title="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="whiteboard-container">
        {/* Toolbar */}
        {store.showToolbar && (
          <aside className="toolbar-sidebar">
            <ToolBar />
          </aside>
        )}

        {/* Canvas */}
        <main className="canvas-area">
          <Canvas />
        </main>

        {/* AI Suggestions Panel */}
        {store.showAISuggestions && (
          <aside className="suggestions-sidebar">
            <AISuggestions />
          </aside>
        )}

        {/* Context Panel */}
        {store.showContextPanel && store.selectedObject && (
          <aside className="context-sidebar">
            <ContextPanel objectId={store.selectedObject} />
          </aside>
        )}
      </div>

      {/* Status Bar */}
      <footer className="whiteboard-footer">
        <div className="footer-content">
          <span className="status-text">
            {store.error ? `❌ ${store.error}` : '✅ Ready'}
          </span>
        </div>
      </footer>

      {store.showBoardHub && <BoardHub />}
    </div>
  );
};

export default WhiteboardPage;
