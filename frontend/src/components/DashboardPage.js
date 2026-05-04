import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { boardApi } from '../services/apiService';
import { BOARD_TEMPLATES, createBoardFromTemplate } from '../utils/boardFeatures';
import './DashboardPage.css';

/**
 * Dashboard Page - List and manage boards
 */
const DashboardPage = ({ isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const store = useStore();
  const userId = store.userId;
  const setError = store.setError;
  const [boards, setBoards] = useState([]);
  const [publicBoards, setPublicBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', templateId: 'blank' });

  // Load boards on component mount
  const loadPublicBoards = useCallback(async () => {
    try {
      const response = await boardApi.getPublic();
      if (response.success) {
        setPublicBoards(response.data);
      }
    } catch (error) {
      console.error('Error loading public boards:', error);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await boardApi.getByUser(userId);
      if (response.success) {
        setBoards(response.data);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [userId, setError]);

  useEffect(() => {
    loadBoards();
    loadPublicBoards();
  }, [loadBoards, loadPublicBoards]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    try {
      const response = await boardApi.create(store.userId, formData.name, formData.description);
      if (response.success) {
        const selectedTemplate = createBoardFromTemplate(formData.templateId, formData.name || response.data.name);
        if (formData.templateId !== 'blank') {
          const templateData = {
            objects: selectedTemplate.objects,
            connections: selectedTemplate.connections
          };
          await boardApi.update(response.data.id, formData.name || response.data.name, formData.description, templateData);
        }

        const createdBoard = formData.templateId === 'blank'
          ? response.data
          : {
              ...response.data,
              data: {
                objects: selectedTemplate.objects,
                connections: selectedTemplate.connections
              }
            };

        setBoards([...boards, createdBoard]);
        setFormData({ name: '', description: '', templateId: 'blank' });
        setShowCreateForm(false);
        navigate(`/board/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error creating board:', error);
      const localBoardId = `local-${Date.now()}`;
      const templateBoard = createBoardFromTemplate(formData.templateId, formData.name || 'Local Draft Board');
      store.setBoardId(localBoardId);
      store.setBoardName(formData.name || templateBoard.name || 'Local Draft Board');
      store.setBoardData(templateBoard);
      store.setError(null);
      setFormData({ name: '', description: '', templateId: 'blank' });
      setShowCreateForm(false);
      navigate(`/board/${localBoardId}`);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      try {
        await boardApi.delete(boardId, store.userId);
        setBoards(boards.filter(b => b.id !== boardId));
        setPublicBoards(publicBoards.filter(b => b.id !== boardId));
      } catch (error) {
        console.error('Error deleting board:', error);
        store.setError('Failed to delete board');
      }
    }
  };

  return (
    <div className={`dashboard-page ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🎨 Whiteboard Dashboard</h1>
          <div className="header-right">
            <span className="user-info">User: {store.userName}</span>
            <button
              className="dark-mode-toggle"
              onClick={toggleDarkMode}
              title="Toggle dark mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Create Board Section */}
        <section className="create-section">
          {!showCreateForm ? (
            <button
              className="create-board-button"
              onClick={() => setShowCreateForm(true)}
            >
              + Create New Board
            </button>
          ) : (
            <form className="create-form" onSubmit={handleCreateBoard}>
              <input
                type="text"
                placeholder="Board name..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
              <textarea
                placeholder="Description (optional)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="template-select"
              >
                {BOARD_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <div className="form-buttons">
                <button type="submit">Create</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', description: '', templateId: 'blank' });
                  }}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Boards Grid */}
        <section className="boards-section">
          <h2>Your Boards ({boards.length})</h2>

          {loading ? (
            <div className="loader">Loading boards...</div>
          ) : boards.length === 0 ? (
            <div className="empty-state">
              <p>No boards yet. Create your first board to get started!</p>
            </div>
          ) : (
            <div className="boards-grid">
              {boards.map(board => (
                <div key={board.id} className="board-card">
                  <div className="board-header">
                    <h3>{board.name}</h3>
                    <div className="board-meta">
                      <span className="object-count">
                        {board.data?.objects?.length || 0} objects
                      </span>
                      <span className="collaboration-count">
                        {board.collaborators?.length || 1} users
                      </span>
                    </div>
                  </div>

                  <p className="board-description">
                    {board.description || 'No description'}
                  </p>

                  <div className="board-footer">
                    <div className="board-dates">
                      <small>
                        Created: {new Date(board.createdAt).toLocaleDateString()}
                      </small>
                      <small>
                        Updated: {new Date(board.updatedAt).toLocaleDateString()}
                      </small>
                    </div>

                    <div className="board-actions">
                      <button
                        className="open-button"
                        onClick={() => navigate(`/board/${board.id}`)}
                      >
                        Open
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteBoard(board.id)}
                        title="Delete board"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="boards-section public-section">
          <h2>Public Boards ({publicBoards.length})</h2>

          {publicBoards.length === 0 ? (
            <div className="empty-state">
              <p>No public boards yet.</p>
            </div>
          ) : (
            <div className="boards-grid">
              {publicBoards.map((board) => (
                <div key={board.id} className="board-card public-board-card">
                  <div className="board-header">
                    <h3>{board.name}</h3>
                    <div className="board-meta">
                      <span className="object-count">
                        {board.data?.objects?.length || 0} objects
                      </span>
                      <span className="collaboration-count">
                        {board.collaborators?.length || 1} users
                      </span>
                    </div>
                  </div>
                  <p className="board-description">
                    {board.description || 'No description'}
                  </p>
                  <div className="board-footer">
                    <div className="board-dates">
                      <small>
                        Updated: {new Date(board.updatedAt).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="board-actions">
                      <button
                        className="open-button"
                        onClick={() => navigate(`/board/${board.id}`)}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>
          AI-Powered Visual Whiteboard v1.0 | 
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
};

export default DashboardPage;
