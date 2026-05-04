import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { exportCanvasToPNG } from '../utils/drawingUtils';
import { downloadTextFile } from '../utils/boardGraph';
import './ToolBar.css';

/**
 * ToolBar component - Drawing tools and settings
 */
const ToolBar = () => {
  const store = useStore();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const tools = [
    { id: 'pen', icon: '✏️', label: 'Pen', shortcut: 'P' },
    { id: 'rectangle', icon: '▭', label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: '○', label: 'Circle', shortcut: 'C' },
    { id: 'arrow', icon: '→', label: 'Arrow', shortcut: 'A' },
    { id: 'text', icon: 'A', label: 'Text', shortcut: 'T' },
    { id: 'eraser', icon: '⌫', label: 'Eraser', shortcut: 'E' },
    { id: 'select', icon: '◉', label: 'Select', shortcut: 'S' }
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#FFC0CB', '#A52A2A', '#808080'
  ];

  const strokeWidths = [1, 2, 4, 6, 8, 10];

  // Handle tool selection
  const handleSelectTool = useCallback((toolId) => {
    store.setSelectedTool(toolId);
  }, [store]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      const target = e.target;
      const isEditingText = target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (isEditingText) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      const toolMap = {
        'p': 'pen',
        'r': 'rectangle',
        'c': 'circle',
        'a': 'arrow',
        't': 'text',
        'e': 'eraser',
        's': 'select'
      };

      if (toolMap[e.key.toLowerCase()]) {
        e.preventDefault();
        handleSelectTool(toolMap[e.key.toLowerCase()]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSelectTool, store]);

  const handleExportPNG = () => {
    const canvas = window.__whiteboardFabricCanvas;
    if (!canvas) {
      store.setError('Canvas is not ready yet');
      return;
    }

    exportCanvasToPNG(canvas, `${store.boardName || 'whiteboard'}.png`);
  };

  const handleCleanUpBoard = () => {
    store.cleanupBoard();
  };

  const handleExportMarkdown = () => {
    const markdown = store.generateArchitectureDocument();
    downloadTextFile(markdown, `${store.boardName || 'whiteboard'}-architecture.md`, 'text/markdown');
  };

  return (
    <div className={`toolbar ${store.isDarkMode ? 'dark' : ''}`}>
      {/* Tools Section */}
      <div className="toolbar-section tools-section">
        <div className="toolbar-label">Tools</div>
        <div className="tools-grid">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-button ${store.selectedTool === tool.id ? 'active' : ''}`}
              onClick={() => handleSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker Section */}
      <div className="toolbar-section color-section">
        <div className="toolbar-label">Color</div>
        <div className="color-picker-container">
          <div className="color-preview" onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}>
            <div className="color-swatch" style={{ backgroundColor: store.selectedColor }}></div>
          </div>
          {isColorPickerOpen && (
            <div className="color-palette">
              {colors.map(color => (
                <button
                  key={color}
                  className={`color-button ${store.selectedColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    store.setSelectedColor(color);
                    setIsColorPickerOpen(false);
                  }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Color Input */}
        <input
          type="color"
          value={store.selectedColor}
          onChange={(e) => store.setSelectedColor(e.target.value)}
          className="color-input"
          title="Custom color"
        />
      </div>

      {/* Stroke Width Section */}
      <div className="toolbar-section stroke-section">
        <div className="toolbar-label">Stroke Width</div>
        <div className="stroke-buttons">
          {strokeWidths.map(width => (
            <button
              key={width}
              className={`stroke-button ${store.selectedStrokeWidth === width ? 'active' : ''}`}
              onClick={() => store.setSelectedStrokeWidth(width)}
              title={`${width}px`}
            >
              <div style={{ height: `${width}px`, backgroundColor: store.selectedColor }} />
            </button>
          ))}
        </div>
      </div>

      {/* Font Size Section (for text tool) */}
      {store.selectedTool === 'text' && (
        <div className="toolbar-section font-section">
          <div className="toolbar-label">Font Size</div>
          <select
            value={store.selectedFontSize}
            onChange={(e) => store.setSelectedFontSize(parseInt(e.target.value))}
            className="font-size-select"
          >
            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="toolbar-section zoom-section">
        <div className="toolbar-label">Zoom</div>
        <div className="zoom-controls">
          <button
            className="zoom-button"
            onClick={() => store.setZoomLevel(store.zoomLevel * 1.2)}
            title="Zoom in (Ctrl + +)"
          >
            +
          </button>
          <span className="zoom-percentage">{Math.round(store.zoomLevel * 100)}%</span>
          <button
            className="zoom-button"
            onClick={() => store.setZoomLevel(store.zoomLevel / 1.2)}
            title="Zoom out (Ctrl + -)"
          >
            −
          </button>
          <button
            className="zoom-button reset"
            onClick={() => store.resetZoomAndPan()}
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Smart Actions */}
      <div className="toolbar-section actions-section">
        <div className="toolbar-label">Actions</div>
        <div className="action-buttons">
          <button
            className="action-button"
            onClick={() => store.setShowAISuggestions(true)}
            title="Open AI suggestions"
          >
            AI
          </button>
          <button
            className="action-button"
            onClick={() => store.setShowBoardHub(true)}
            title="Open board hub"
          >
            Hub
          </button>
          <button
            className="action-button"
            onClick={handleCleanUpBoard}
            title="Normalize the board layout"
          >
            Clean Up Board
          </button>
          <button
            className="action-button"
            onClick={handleExportMarkdown}
            title="Export architecture document"
          >
            Doc
          </button>
          <button
            className="action-button"
            onClick={handleExportPNG}
            title="Export board as PNG"
          >
            PNG
          </button>
        </div>
      </div>

      {/* History Controls */}
      <div className="toolbar-section history-section">
        <div className="toolbar-label">History</div>
        <div className="history-controls">
          <button
            className="history-button"
            onClick={() => store.undo()}
            disabled={store.historyIndex <= 0}
            title="Undo (Ctrl + Z)"
          >
            ↶
          </button>
          <button
            className="history-button"
            onClick={() => store.redo()}
            disabled={store.historyIndex >= store.history.length - 1}
            title="Redo (Ctrl + Y)"
          >
            ↷
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="toolbar-section status-section">
        <div className="status-info">
          <span>Objects: {store.boardData.objects.length}</span>
          <span>Users: {store.activeUsers.length}</span>
          {store.lastSaveTime && (
            <span>Saved: {new Date(store.lastSaveTime).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolBar;
