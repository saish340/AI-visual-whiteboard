import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { aiApi } from '../services/apiService';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import './AISuggestions.css';

/**
 * AI Suggestions Panel - Shows layout and architecture suggestions
 */
const AISuggestions = () => {
  const store = useStore();
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('layout');

  // Fetch suggestions
  const fetchSuggestions = async () => {
    if (store.boardData.objects.length === 0) {
      store.setError('Add elements to board first');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'layout') {
        const response = await aiApi.getLayoutSuggestions(
          store.boardData.objects,
          store.boardData.connections
        );
        setSuggestions(response.data);
      } else if (activeTab === 'architecture') {
        const response = await aiApi.analyze(store.boardData, store.userId);
        setSuggestions(response.data);
      } else if (activeTab === 'apis') {
        const response = await aiApi.getApiSuggestions(store.boardData);
        setSuggestions(response.data);
      }
    } catch (error) {
      store.setError('Failed to fetch suggestions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchSuggestions();
  }, [activeTab]);

  // Apply layout suggestion
  const applyLayoutSuggestion = (suggestion) => {
    if (suggestion.positions) {
      Object.entries(suggestion.positions).forEach(([objectId, position]) => {
        store.updateObject(objectId, position);
      });
    }
  };

  return (
    <div className={`ai-suggestions ${store.isDarkMode ? 'dark' : ''}`}>
      <div className="suggestions-header">
        <h2>🤖 AI Suggestions</h2>
        <button
          className="close-button"
          onClick={() => store.setShowAISuggestions(false)}
          title="Close"
        >
          <FiX />
        </button>
      </div>

      {/* Tabs */}
      <div className="suggestions-tabs">
        <button
          className={`tab ${activeTab === 'layout' ? 'active' : ''}`}
          onClick={() => setActiveTab('layout')}
        >
          Layout
        </button>
        <button
          className={`tab ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          Architecture
        </button>
        <button
          className={`tab ${activeTab === 'apis' ? 'active' : ''}`}
          onClick={() => setActiveTab('apis')}
        >
          APIs
        </button>
      </div>

      {/* Refresh Button */}
      <button
        className="refresh-button"
        onClick={fetchSuggestions}
        disabled={loading}
      >
        <FiRefreshCw className={loading ? 'spinning' : ''} /> {loading ? 'Loading...' : 'Refresh'}
      </button>

      {/* Content */}
      <div className="suggestions-content">
        {loading && <div className="loader">Analyzing...</div>}

        {!loading && suggestions && activeTab === 'layout' && (
          <div className="layout-suggestions">
            <div className="suggestion-item">
              <h3>Layout Score</h3>
              <p>{suggestions.currentLayoutScore || 0}% → {suggestions.suggestedLayoutScore || 0}%</p>
            </div>

            {suggestions.detectedDiagramType && (
              <div className="suggestion-item">
                <h3>Detected Type</h3>
                <p>{suggestions.detectedDiagramType}</p>
              </div>
            )}

            {suggestions.issues && suggestions.issues.length > 0 && (
              <div className="suggestion-item">
                <h3>Issues Found</h3>
                <ul>
                  {suggestions.issues.map((issue, idx) => (
                    <li key={idx} className={`issue ${issue.severity}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.suggestions && suggestions.suggestions.length > 0 && (
              <div className="suggestion-item">
                <h3>Suggestions</h3>
                {suggestions.suggestions.map((sugg, idx) => (
                  <div key={idx} className="suggestion-action">
                    <p>{sugg.description}</p>
                    {sugg.positions && (
                      <button
                        className="apply-button"
                        onClick={() => applyLayoutSuggestion(sugg)}
                      >
                        Apply Layout
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && suggestions && activeTab === 'architecture' && (
          <div className="architecture-suggestions">
            {suggestions.summary && (
              <div className="suggestion-item">
                <h3>Summary</h3>
                <p>{suggestions.summary}</p>
              </div>
            )}

            {suggestions.patterns && suggestions.patterns.length > 0 && (
              <div className="suggestion-item">
                <h3>Patterns</h3>
                <ul>
                  {suggestions.patterns.map((pattern, idx) => (
                    <li key={idx}>{pattern}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.improvements && suggestions.improvements.length > 0 && (
              <div className="suggestion-item">
                <h3>Improvements</h3>
                <ul>
                  {suggestions.improvements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.scalabilityConcerns && suggestions.scalabilityConcerns.length > 0 && (
              <div className="suggestion-item concerns">
                <h3>⚠️ Scalability Concerns</h3>
                <ul>
                  {suggestions.scalabilityConcerns.map((concern, idx) => (
                    <li key={idx}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!loading && suggestions && activeTab === 'apis' && (
          <div className="api-suggestions">
            {suggestions.apis && suggestions.apis.length > 0 && (
              <div className="suggestion-item">
                <h3>REST APIs</h3>
                <ul>
                  {suggestions.apis.map((api, idx) => (
                    <li key={idx}>
                      <strong>{api.name}</strong>: {api.reasoning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.messageQueues && suggestions.messageQueues.length > 0 && (
              <div className="suggestion-item">
                <h3>Message Queues</h3>
                <ul>
                  {suggestions.messageQueues.map((mq, idx) => (
                    <li key={idx}>
                      <strong>{mq.name}</strong>: {mq.reasoning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.dataLayers && suggestions.dataLayers.length > 0 && (
              <div className="suggestion-item">
                <h3>Data Layers</h3>
                <ul>
                  {suggestions.dataLayers.map((dl, idx) => (
                    <li key={idx}>
                      <strong>{dl.name}</strong>: {dl.reasoning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.security && (
              <div className="suggestion-item">
                <h3>🔒 Security</h3>
                <p>
                  <strong>{suggestions.security.name}</strong>: {suggestions.security.reasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && !suggestions && (
          <div className="no-suggestions">
            <p>No suggestions available. Click refresh to generate suggestions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestions;
