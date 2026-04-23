import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../models/Board.js';
import { APIError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Create a new board
 * POST /api/boards/create
 */
router.post('/create', async (req, res) => {
  try {
    const { name, description, userId } = req.body;

    if (!userId) {
      throw new APIError('User ID is required', 400);
    }

    const board = new Board({
      id: uuidv4(),
      name: name || 'Untitled Board',
      description,
      owner: userId,
      data: {
        objects: [],
        connections: []
      },
      collaborators: [{
        userId,
        role: 'admin'
      }]
    });

    await board.save();

    res.status(201).json({
      success: true,
      data: board
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get board by ID
 * GET /api/boards/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findOne({ id: req.params.id });

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    res.json({
      success: true,
      data: board
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all boards for a user
 * GET /api/boards/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.params.userId },
        { 'collaborators.userId': req.params.userId }
      ]
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update board data
 * PUT /api/boards/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, data } = req.body;

    const board = await Board.findOneAndUpdate(
      { id: req.params.id },
      {
        ...(name && { name }),
        ...(description && { description }),
        ...(data && { data }),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    res.json({
      success: true,
      data: board
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete board
 * DELETE /api/boards/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    const board = await Board.findOne({ id: req.params.id });

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    if (board.owner !== userId) {
      throw new APIError('Only board owner can delete', 403);
    }

    await Board.deleteOne({ id: req.params.id });

    res.json({
      success: true,
      message: 'Board deleted'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Add collaborator to board
 * POST /api/boards/:id/collaborators
 */
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { userId, email, role = 'editor' } = req.body;

    const board = await Board.findOne({ id: req.params.id });

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    // Check if already collaborator
    const exists = board.collaborators.some(c => c.userId === userId);
    if (exists) {
      throw new APIError('User already a collaborator', 400);
    }

    board.collaborators.push({
      userId,
      email,
      role
    });

    await board.save();

    res.status(201).json({
      success: true,
      data: board.collaborators
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get board version history
 * GET /api/boards/:id/history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const board = await Board.findOne({ id: req.params.id });

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    res.json({
      success: true,
      data: board.versions.sort((a, b) => b.versionNumber - a.versionNumber)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Restore board to specific version
 * POST /api/boards/:id/restore
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const { versionNumber } = req.body;

    const board = await Board.findOne({ id: req.params.id });

    if (!board) {
      throw new APIError('Board not found', 404);
    }

    const version = board.versions.find(v => v.versionNumber === versionNumber);

    if (!version) {
      throw new APIError('Version not found', 404);
    }

    board.data = version.data;
    board.currentVersion = versionNumber + 1;
    
    // Add new version entry
    board.versions.push({
      versionNumber: board.currentVersion,
      data: version.data,
      changeDescription: `Restored from version ${versionNumber}`
    });

    await board.save();

    res.json({
      success: true,
      data: board
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
