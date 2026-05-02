import express from 'express';
import { analyzeBoard, suggestLayout, generateApiSuggestions, generateBoardPatch, generateArchitectureDocument } from '../services/aiService.js';

const router = express.Router();

/**
 * Analyze board and generate suggestions
 * POST /api/ai/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { boardData, userId } = req.body;

    if (!boardData) {
      return res.status(400).json({
        success: false,
        error: 'Board data is required'
      });
    }

    const analysis = await analyzeBoard(boardData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('❌ AI Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze board'
    });
  }
});

/**
 * Get smart layout suggestions
 * POST /api/ai/layout-suggestions
 */
router.post('/layout-suggestions', async (req, res) => {
  try {
    const { objects, connections } = req.body;

    if (!objects || !Array.isArray(objects)) {
      return res.status(400).json({
        success: false,
        error: 'Objects array is required'
      });
    }

    const suggestions = await suggestLayout({ objects, connections: connections || [] });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('❌ Layout suggestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate layout suggestions'
    });
  }
});

/**
 * Generate API recommendations for diagram
 * POST /api/ai/api-suggestions
 */
router.post('/api-suggestions', async (req, res) => {
  try {
    const { boardData } = req.body;

    if (!boardData) {
      return res.status(400).json({
        success: false,
        error: 'Board data is required'
      });
    }

    const suggestions = await generateApiSuggestions(boardData);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('❌ API suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate API suggestions'
    });
  }
});

/**
 * Generate a structured patch that can be applied to the canvas
 * POST /api/ai/board-patch
 */
router.post('/board-patch', async (req, res) => {
  try {
    const { boardData } = req.body;

    if (!boardData) {
      return res.status(400).json({
        success: false,
        error: 'Board data is required'
      });
    }

    const patch = await generateBoardPatch(boardData);

    res.json({
      success: true,
      data: patch
    });
  } catch (error) {
    console.error('❌ Board patch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate board patch'
    });
  }
});

/**
 * Generate a Markdown architecture document
 * POST /api/ai/architecture-document
 */
router.post('/architecture-document', async (req, res) => {
  try {
    const { boardData } = req.body;

    if (!boardData) {
      return res.status(400).json({
        success: false,
        error: 'Board data is required'
      });
    }

    const document = await generateArchitectureDocument(boardData);

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('❌ Architecture document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate architecture document'
    });
  }
});

export default router;
