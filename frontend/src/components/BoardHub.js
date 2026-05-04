import React, { useMemo, useRef, useState } from 'react';
import { FiX, FiCopy, FiUpload, FiDownload, FiLock, FiUsers, FiSearch, FiLayers } from 'react-icons/fi';
import { useStore } from '../store/useStore';
import { boardApi } from '../services/apiService';
import { emitBoardPatch, emitSaveBoard } from '../services/socketService';
import {
  BOARD_TEMPLATES,
  copyTextToClipboard,
  exportCanvasToSVG,
  getBoardShareUrl,
  getTemplatePatch,
  readBoardDataFromFile,
  searchBoardContent
} from '../utils/boardFeatures';
import { downloadTextFile, generateArchitectureMarkdown } from '../utils/boardGraph';
import './BoardHub.css';

const BoardHub = () => {
  const store = useStore();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const searchResults = useMemo(
    () => searchBoardContent(store.boardData, searchQuery),
    [searchQuery, store.boardData]
  );

  const boardUrl = store.boardId ? getBoardShareUrl(store.boardId) : '';

  const broadcastBoardChange = (nextBoardData) => {
    if (!store.boardId) {
      return;
    }

    emitSaveBoard(store.boardId, nextBoardData, store.userId);
  };

  const handleApplyTemplate = (templateId) => {
    const patch = getTemplatePatch(templateId);
    const nextBoardData = store.applyBoardPatch(patch);

    if (store.boardId) {
      emitBoardPatch(store.boardId, patch);
      broadcastBoardChange(nextBoardData);
    }
  };

  const handleExportJSON = () => {
    downloadTextFile(
      JSON.stringify(store.boardData, null, 2),
      `${store.boardName || 'whiteboard'}.json`,
      'application/json'
    );
  };

  const handleExportSVG = () => {
    const canvas = window.__whiteboardFabricCanvas;
    if (!exportCanvasToSVG(canvas, `${store.boardName || 'whiteboard'}.svg`)) {
      store.setError('Canvas is not ready yet');
    }
  };

  const handleExportMarkdown = () => {
    const markdown = generateArchitectureMarkdown(store.boardData);
    downloadTextFile(markdown, `${store.boardName || 'whiteboard'}-architecture.md`, 'text/markdown');
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const previousObjectIds = store.boardData.objects.map((object) => object.id);
      const { boardData, boardName } = await readBoardDataFromFile(file);
      const nextBoardData = store.importBoardData(boardData, boardName);

      if (store.boardId) {
        const removeObjectIds = previousObjectIds.filter(
          (objectId) => !nextBoardData.objects.some((object) => object.id === objectId)
        );
        const patch = {
          objects: nextBoardData.objects,
          connections: nextBoardData.connections,
          ...(removeObjectIds.length > 0 ? { removeObjectIds } : {})
        };

        emitBoardPatch(store.boardId, patch);
        await boardApi.update(store.boardId, boardName || store.boardName, undefined, {
          objects: nextBoardData.objects,
          connections: nextBoardData.connections
        });
        broadcastBoardChange(nextBoardData);
      }
    } catch (error) {
      store.setError(`Import failed: ${error.message}`);
    }
  };

  const handleCopyLink = async () => {
    if (!boardUrl) {
      return;
    }

    await copyTextToClipboard(boardUrl);
    setCopyStatus('Link copied');
    window.setTimeout(() => setCopyStatus(''), 1800);
  };

  const handleToggleVisibility = async () => {
    if (!store.boardId) {
      return;
    }

    try {
      const response = await boardApi.setVisibility(store.boardId, store.userId, !store.boardIsPublic);
      if (response.success) {
        store.setBoardIsPublic(response.data.isPublic);
      }
    } catch (error) {
      store.setError(error.response?.data?.error || error.message || 'Failed to update visibility');
    }
  };

  const openImportDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="board-hub">
      <div className="board-hub-header">
        <div>
          <p className="board-hub-kicker">Board hub</p>
          <h2>Search, templates, sharing</h2>
        </div>
        <button className="board-hub-close" onClick={() => store.setShowBoardHub(false)} title="Close">
          <FiX />
        </button>
      </div>

      <div className="board-hub-tabs">
        {[
          ['search', 'Search', FiSearch],
          ['templates', 'Templates', FiLayers],
          ['activity', 'Activity', FiUsers],
          ['presence', 'Presence', FiUsers],
          ['share', 'Share', FiLock],
          ['export', 'Import/Export', FiDownload]
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            className={`board-hub-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="board-hub-body">
        {activeTab === 'search' && (
          <div className="board-hub-section">
            <label>Search board content</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search objects, notes, comments..."
            />
            <div className="board-hub-results">
              {searchResults.length === 0 ? (
                <p className="empty-text">No matches found.</p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="board-hub-result"
                    onClick={() => {
                      if (result.objectId) {
                        store.setSelectedObject(result.objectId);
                        store.setShowContextPanel(true);
                      }
                    }}
                  >
                    <strong>{result.title}</strong>
                    <span>{result.description}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="board-hub-section">
            {BOARD_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="board-hub-template"
                onClick={() => handleApplyTemplate(template.id)}
              >
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="board-hub-section">
            {store.activityFeed.length === 0 ? (
              <p className="empty-text">Activity will appear here as you edit the board.</p>
            ) : (
              store.activityFeed.map((item) => (
                <div key={item.id} className="board-hub-activity">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <small>{new Date(item.timestamp).toLocaleTimeString()}</small>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'presence' && (
          <div className="board-hub-section">
            <div className="presence-summary">
              <strong>{store.activeUsers.length}</strong>
              <span>{store.activeUsers.length === 1 ? 'user is' : 'users are'} online</span>
            </div>
            {store.activeUsers.map((user) => {
              const cursor = store.cursorPositions[user.userId];

              return (
                <div key={user.userId} className="board-hub-presence">
                  <div className="presence-avatar" style={{ backgroundColor: user.color }}>
                    {user.userName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{user.userName}</strong>
                    <span>
                      {cursor ? `Cursor ${Math.round(cursor.x)}, ${Math.round(cursor.y)}` : 'Active on board'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'share' && (
          <div className="board-hub-section">
            <div className="share-row">
              <strong>{store.boardIsPublic ? 'Public board' : 'Private board'}</strong>
              <button onClick={handleToggleVisibility} disabled={!store.boardId}>
                {store.boardIsPublic ? 'Make private' : 'Make public'}
              </button>
            </div>
            <div className="share-row">
              <input type="text" value={boardUrl} readOnly placeholder="Share link appears here" />
              <button onClick={handleCopyLink} disabled={!boardUrl}>
                <FiCopy /> Copy
              </button>
            </div>
            {copyStatus && <p className="helper-text">{copyStatus}</p>}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="board-hub-section">
            <button onClick={handleExportJSON}>
              <FiDownload /> Export JSON
            </button>
            <button onClick={handleExportSVG}>
              <FiDownload /> Export SVG
            </button>
            <button onClick={handleExportMarkdown}>
              <FiDownload /> Export architecture doc
            </button>
            <button onClick={openImportDialog}>
              <FiUpload /> Import JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} hidden />
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardHub;