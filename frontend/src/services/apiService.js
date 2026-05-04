/**
 * API service for backend communication
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000
});

// Board endpoints
export const boardApi = {
  // Create new board
  create: async (userId, name, description) => {
    const response = await api.post('/boards/create', {
      userId,
      name,
      description
    });
    return response.data;
  },

  // Get public boards
  getPublic: async () => {
    const response = await api.get('/boards/public');
    return response.data;
  },

  // Get board by ID
  getById: async (boardId) => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
  },

  // Get all boards for user
  getByUser: async (userId) => {
    const response = await api.get(`/boards/user/${userId}`);
    return response.data;
  },

  // Update board
  update: async (boardId, name, description, data, isPublic) => {
    const response = await api.put(`/boards/${boardId}`, {
      name,
      description,
      data,
      isPublic
    });
    return response.data;
  },

  // Update board visibility
  setVisibility: async (boardId, userId, isPublic) => {
    const response = await api.put(`/boards/${boardId}/visibility`, {
      userId,
      isPublic
    });
    return response.data;
  },

  // Delete board
  delete: async (boardId, userId) => {
    const response = await api.delete(`/boards/${boardId}`, {
      data: { userId }
    });
    return response.data;
  },

  // Get version history
  getHistory: async (boardId) => {
    const response = await api.get(`/boards/${boardId}/history`);
    return response.data;
  },

  // Restore to version
  restore: async (boardId, versionNumber) => {
    const response = await api.post(`/boards/${boardId}/restore`, {
      versionNumber
    });
    return response.data;
  },

  // Add collaborator
  addCollaborator: async (boardId, userId, email, role = 'editor') => {
    const response = await api.post(`/boards/${boardId}/collaborators`, {
      userId,
      email,
      role
    });
    return response.data;
  }
};

// AI endpoints
export const aiApi = {
  // Analyze board
  analyze: async (boardData, userId) => {
    const response = await api.post('/ai/analyze', {
      boardData,
      userId
    });
    return response.data;
  },

  // Get layout suggestions
  getLayoutSuggestions: async (objects, connections) => {
    const response = await api.post('/ai/layout-suggestions', {
      objects,
      connections
    });
    return response.data;
  },

  // Get API suggestions
  getApiSuggestions: async (boardData) => {
    const response = await api.post('/ai/api-suggestions', {
      boardData
    });
    return response.data;
  },

  // Generate board patch for visual improvements
  getBoardPatch: async (boardData) => {
    const response = await api.post('/ai/board-patch', {
      boardData
    });
    return response.data;
  },

  // Generate architecture document
  generateArchitectureDocument: async (boardData) => {
    const response = await api.post('/ai/architecture-document', {
      boardData
    });
    return response.data;
  }
};

// Error handler
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export default api;
