import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { emitUpdateObject } from '../services/socketService';
import { FiX } from 'react-icons/fi';
import { downloadTextFile, generateArchitectureMarkdown, searchContextEntries } from '../utils/boardGraph';
import './ContextPanel.css';

/**
 * Context Panel - Shows and edits metadata for selected objects
 */
const ContextPanel = ({ objectId }) => {
  const store = useStore();
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get selected object
  const object = store.boardData.objects.find(obj => obj.id === objectId);
  const metadata = object?.metadata || {};
  const matchingEntries = searchContextEntries(store.boardData, searchQuery, { elementId: objectId });

  useEffect(() => {
    setNotes(metadata.notes || '');
    setCode(metadata.code || '');
    setLinks(metadata.links || []);
  }, [objectId, metadata.notes, metadata.code, metadata.links]);

  if (!object) {
    return null;
  }

  const handleSaveMetadata = () => {
    const nextMetadata = {
      notes,
      code,
      links
    };

    store.updateMetadata(objectId, nextMetadata);
    if (store.boardId) {
      emitUpdateObject(store.boardId, objectId, { metadata: nextMetadata });
    }
  };

  const addLink = () => {
    if (newLink.trim()) {
      setLinks([...links, newLink]);
      setNewLink('');
    }
  };

  const handleExportMarkdown = () => {
    const markdown = generateArchitectureMarkdown(store.boardData);
    downloadTextFile(markdown, `${store.boardName || 'whiteboard'}-architecture.md`, 'text/markdown');
  };

  const handleExportJSON = () => {
    downloadTextFile(
      JSON.stringify(store.boardData, null, 2),
      `${store.boardName || 'whiteboard'}.json`,
      'application/json'
    );
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <div className={`context-panel ${store.isDarkMode ? 'dark' : ''}`}>
      <div className="panel-header">
        <h3>📝 Element Details</h3>
        <button
          className="close-button"
          onClick={() => store.setShowContextPanel(false)}
        >
          <FiX />
        </button>
      </div>

      <div className="metadata-section">
        <label>Search Context</label>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes, code, links..."
        />
        <div className="links-container">
          {matchingEntries.map((entry) => (
            <div key={entry.id} className="link-item">
              <span>{entry.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Object Info */}
      <div className="object-info">
        <div className="info-row">
          <label>Type:</label>
          <span>{object.type}</span>
        </div>
        <div className="info-row">
          <label>Text:</label>
          <span>{object.text || '(empty)'}</span>
        </div>
        <div className="info-row">
          <label>Position:</label>
          <span>{Math.round(object.x)}, {Math.round(object.y)}</span>
        </div>
        <div className="info-row">
          <label>Size:</label>
          <span>{Math.round(object.width)} × {Math.round(object.height)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="metadata-section">
        <label>Notes</label>
        <textarea
          value={notes || metadata.notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this element..."
          rows={4}
        />
      </div>

      {/* Code Snippet */}
      <div className="metadata-section">
        <label>Code Snippet</label>
        <textarea
          value={code || metadata.code || ''}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Add code snippet..."
          rows={4}
          className="code-editor"
        />
      </div>

      {/* Links */}
      <div className="metadata-section">
        <label>Links</label>
        <div className="links-container">
          {links.length === 0 && metadata.links && (
            <>
              {metadata.links.map((link, idx) => (
                <div key={idx} className="link-item">
                  <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  <button
                    className="remove-link"
                    onClick={() => removeLink(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </>
          )}
          {links.map((link, idx) => (
            <div key={idx} className="link-item">
              <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
              <button
                className="remove-link"
                onClick={() => removeLink(idx)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="link-input-container">
          <input
            type="url"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://example.com"
            onKeyPress={(e) => e.key === 'Enter' && addLink()}
          />
          <button onClick={addLink}>Add Link</button>
        </div>
      </div>

      {/* Save Button */}
      <button className="save-metadata-button" onClick={handleSaveMetadata}>
        Save Metadata
      </button>

      <button className="save-metadata-button" onClick={handleExportMarkdown}>
        Export Architecture Doc
      </button>

      <button className="save-metadata-button" onClick={handleExportJSON}>
        Export JSON
      </button>
    </div>
  );
};

export default ContextPanel;
