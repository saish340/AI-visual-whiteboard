/**
 * AI Service - Integrates with OpenAI for smart suggestions
 * Handles: board analysis, layout suggestions, architecture recommendations
 */
import { Configuration, OpenAIApi } from 'openai';

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
);

/**
 * Analyze a whiteboard diagram for architectural insights
 */
export async function analyzeBoard(boardData) {
  try {
    if (!boardData?.objects || boardData.objects.length === 0) {
      return {
        summary: 'Empty board',
        insights: [],
        suggestions: []
      };
    }

    // Extract diagram structure
    const diagram = extractDiagramStructure(boardData);

    // If no OpenAI key, return basic analysis
    if (!process.env.OPENAI_API_KEY) {
      return generateLocalAnalysis(diagram);
    }

    // Use OpenAI for detailed analysis
    const prompt = `
Analyze this system architecture diagram:
- Components: ${JSON.stringify(diagram.components)}
- Connections: ${JSON.stringify(diagram.connections)}

Provide:
1. Architecture summary (1-2 sentences)
2. Identified patterns (2-3 items)
3. Potential improvements (3-4 items)
4. Scalability concerns (2-3 items)

Format as JSON with keys: summary, patterns, improvements, scalabilityConcerns
    `;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert system architect. Analyze diagrams and provide actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysisText = response.data.choices[0].message.content;
    const analysis = parseAIResponse(analysisText);

    return {
      summary: analysis.summary,
      patterns: analysis.patterns || [],
      improvements: analysis.improvements || [],
      scalabilityConcerns: analysis.scalabilityConcerns || [],
      componentCount: diagram.components.length,
      connectionCount: diagram.connections.length
    };
  } catch (error) {
    console.error('Error in analyzeBoard:', error);
    return generateLocalAnalysis(extractDiagramStructure(boardData || { objects: [] }));
  }
}

/**
 * Generate smart layout suggestions for messy diagrams
 */
export async function suggestLayout(boardData) {
  try {
    const { objects = [], connections = [] } = boardData;

    if (objects.length === 0) {
      return {
        suggestions: [],
        algorithm: 'none',
        estimatedImprovement: 0
      };
    }

    // Detect layout issues
    const issues = detectLayoutIssues(objects, connections);

    // Generate layout suggestions based on diagram type
    const layoutType = detectDiagramType(objects, connections);
    const suggestions = generateLayoutSuggestions(objects, connections, layoutType);

    return {
      currentLayoutScore: calculateLayoutScore(objects),
      suggestedLayoutScore: calculateLayoutScore(applyLayoutSuggestions(objects, suggestions)),
      suggestions,
      detectedDiagramType: layoutType,
      issues,
      algorithm: layoutType === 'flowchart' ? 'hierarchical' : 
                layoutType === 'sequence' ? 'sequence-diagram' : 'force-directed'
    };
  } catch (error) {
    console.error('Error in suggestLayout:', error);
    return {
      suggestions: [],
      error: error.message
    };
  }
}

/**
 * Generate API recommendations based on diagram
 */
export async function generateApiSuggestions(boardData) {
  try {
    if (!boardData?.objects || boardData.objects.length === 0) {
      return {
        suggestions: [],
        message: 'Add components to diagram for API suggestions'
      };
    }

    // Extract component names and relationships
    const components = boardData.objects
      .filter(obj => obj.type === 'rect' && obj.text)
      .map(obj => obj.text);

    if (!process.env.OPENAI_API_KEY) {
      return generateLocalApiSuggestions(components);
    }

    const prompt = `
For a system with these components: ${components.join(', ')}

Suggest:
1. 3-4 REST APIs needed
2. 2-3 event/message queues
3. 2-3 databases/caching layers
4. Security/Auth approach

Format as JSON with keys: apis, messageQueues, dataLayers, security
Each with 'name' and 'reasoning' fields.
    `;

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a system architect expert. Suggest technologies and APIs for the given system architecture.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    const suggestions = parseAIResponse(response.data.choices[0].message.content);

    return {
      components,
      apis: suggestions.apis || [],
      messageQueues: suggestions.messageQueues || [],
      dataLayers: suggestions.dataLayers || [],
      security: suggestions.security || []
    };
  } catch (error) {
    console.error('Error in generateApiSuggestions:', error);
    return {
      suggestions: [],
      error: error.message
    };
  }
}

// ============ Helper Functions ============

function extractDiagramStructure(boardData) {
  const components = boardData.objects
    .filter(obj => ['rect', 'circle'].includes(obj.type))
    .map(obj => ({
      id: obj.id,
      name: obj.text || obj.type,
      type: obj.type
    }));

  const connections = boardData.connections || [];

  return { components, connections };
}

function detectLayoutIssues(objects, connections) {
  const issues = [];

  // Check for overlapping objects
  const overlapping = findOverlappingObjects(objects);
  if (overlapping.length > 0) {
    issues.push({
      type: 'overlapping',
      severity: 'high',
      message: `${overlapping.length} objects are overlapping`,
      objectIds: overlapping
    });
  }

  // Check for dense clustering
  const clusters = findClusters(objects);
  if (clusters.some(c => c.density > 0.7)) {
    issues.push({
      type: 'dense-clustering',
      severity: 'medium',
      message: 'Some areas have high density of objects'
    });
  }

  // Check for long connections
  const longConnections = connections.filter(conn => {
    const from = objects.find(o => o.id === conn.fromId);
    const to = objects.find(o => o.id === conn.toId);
    if (!from || !to) return false;
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    return distance > 500;
  });

  if (longConnections.length > 0) {
    issues.push({
      type: 'long-connections',
      severity: 'medium',
      message: `${longConnections.length} connections are very long`
    });
  }

  return issues;
}

function detectDiagramType(objects, connections) {
  // Simple heuristic to detect diagram type
  const hasArrows = objects.some(obj => obj.type === 'arrow');
  const connectionDensity = connections.length / Math.max(objects.length, 1);

  if (hasArrows || connectionDensity > 0.3) {
    return 'flowchart';
  } else if (connectionDensity > 0.5) {
    return 'network';
  } else {
    return 'generic';
  }
}

function generateLayoutSuggestions(objects, connections, layoutType) {
  const suggestions = [];

  if (layoutType === 'flowchart') {
    // Arrange in hierarchical layers
    const layers = layerizeObjects(objects, connections);
    suggestions.push({
      type: 'hierarchical-layout',
      description: 'Arrange components in layers',
      positions: generateHierarchicalLayout(layers, objects)
    });
  } else if (layoutType === 'network') {
    // Force-directed layout
    suggestions.push({
      type: 'force-directed',
      description: 'Distribute components evenly',
      positions: generateForceDirectedLayout(objects, connections)
    });
  } else {
    // Simple grid layout
    suggestions.push({
      type: 'grid-layout',
      description: 'Arrange in grid pattern',
      positions: generateGridLayout(objects)
    });
  }

  // Add alignment suggestions
  suggestions.push({
    type: 'alignment',
    description: 'Align components to grid',
    gridSize: 20
  });

  return suggestions;
}

function calculateLayoutScore(objects) {
  if (objects.length <= 1) return 100;

  let score = 100;

  // Penalty for overlaps
  const overlaps = findOverlappingObjects(objects).length;
  score -= overlaps * 5;

  // Penalty for extreme clustering
  const clusters = findClusters(objects);
  clusters.forEach(cluster => {
    if (cluster.density > 0.8) score -= 10;
    if (cluster.density > 0.6) score -= 5;
  });

  return Math.max(0, score);
}

function findOverlappingObjects(objects) {
  const overlapping = [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      if (doObjectsOverlap(objects[i], objects[j])) {
        overlapping.push(objects[i].id, objects[j].id);
      }
    }
  }
  return [...new Set(overlapping)];
}

function doObjectsOverlap(obj1, obj2) {
  const padding = 10;
  return !(
    obj1.x + obj1.width + padding < obj2.x ||
    obj2.x + obj2.width + padding < obj1.x ||
    obj1.y + obj1.height + padding < obj2.y ||
    obj2.y + obj2.height + padding < obj1.y
  );
}

function findClusters(objects) {
  const clusters = [];
  const spacing = 100;
  const clusterSize = spacing * 2;

  objects.forEach(obj => {
    const nearby = objects.filter(o => 
      Math.abs(o.x - obj.x) < clusterSize &&
      Math.abs(o.y - obj.y) < clusterSize
    );
    
    if (nearby.length > 2) {
      const density = nearby.length / (clusterSize * clusterSize) * 10000;
      clusters.push({ center: obj, density, objects: nearby });
    }
  });

  return clusters;
}

function layerizeObjects(objects, connections) {
  // Simple layering algorithm for hierarchical layout
  const layers = [];
  const visited = new Set();

  objects.forEach(obj => {
    if (!visited.has(obj.id)) {
      const layer = calculateLayer(obj, objects, connections, visited);
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(obj);
      visited.add(obj.id);
    }
  });

  return layers.filter(Boolean);
}

function calculateLayer(obj, objects, connections, visited) {
  const incoming = connections.filter(c => c.toId === obj.id);
  if (incoming.length === 0) return 0;

  const maxParentLayer = Math.max(...incoming.map(conn => {
    const parent = objects.find(o => o.id === conn.fromId);
    return parent ? calculateLayer(parent, objects, connections, visited) : 0;
  }));

  return maxParentLayer + 1;
}

function generateHierarchicalLayout(layers, objects) {
  const positions = {};
  const horizontalSpacing = 150;
  const verticalSpacing = 100;

  layers.forEach((layer, layerIndex) => {
    const layerWidth = layer.length * horizontalSpacing;
    const startX = 100;

    layer.forEach((obj, index) => {
      positions[obj.id] = {
        x: startX + index * horizontalSpacing,
        y: layerIndex * verticalSpacing + 50
      };
    });
  });

  return positions;
}

function generateForceDirectedLayout(objects, connections) {
  // Simplified force-directed layout
  const positions = {};
  const centerX = 400, centerY = 300;
  const radius = Math.min(200, objects.length * 10);

  objects.forEach((obj, index) => {
    const angle = (index / objects.length) * 2 * Math.PI;
    positions[obj.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  return positions;
}

function generateGridLayout(objects) {
  const positions = {};
  const cols = Math.ceil(Math.sqrt(objects.length));
  const spacing = 150;

  objects.forEach((obj, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions[obj.id] = {
      x: 50 + col * spacing,
      y: 50 + row * spacing
    };
  });

  return positions;
}

function applyLayoutSuggestions(objects, suggestions) {
  // Apply the first layout suggestion's positions
  if (suggestions.length === 0) return objects;

  const layoutSuggestion = suggestions.find(s => s.positions);
  if (!layoutSuggestion) return objects;

  return objects.map(obj => ({
    ...obj,
    x: layoutSuggestion.positions[obj.id]?.x || obj.x,
    y: layoutSuggestion.positions[obj.id]?.y || obj.y
  }));
}

function generateLocalAnalysis(diagram) {
  const patterns = [];
  const improvements = [];
  const concerns = [];

  if (diagram.components.length > 10) {
    concerns.push('System has many components - consider breaking into modules');
  }

  if (diagram.connections.length / diagram.components.length > 2) {
    concerns.push('High connection density - consider refactoring');
    patterns.push('Highly interconnected system');
  } else {
    patterns.push('Moderately coupled architecture');
  }

  improvements.push('Consider adding API gateway pattern');
  improvements.push('Implement caching layer for performance');
  improvements.push('Add monitoring and logging components');

  return {
    summary: `System with ${diagram.components.length} components and ${diagram.connections.length} connections`,
    patterns,
    improvements,
    scalabilityConcerns: concerns
  };
}

function generateLocalApiSuggestions(components) {
  return {
    components,
    apis: [
      { name: 'REST API Gateway', reasoning: 'Central API endpoint for client communication' },
      { name: 'Service-to-Service API', reasoning: 'Internal communication between services' },
      { name: 'Webhook API', reasoning: 'Event-driven communication' }
    ],
    messageQueues: [
      { name: 'RabbitMQ or Kafka', reasoning: 'Asynchronous message processing' }
    ],
    dataLayers: [
      { name: 'Redis Cache', reasoning: 'High-performance caching' },
      { name: 'MongoDB/PostgreSQL', reasoning: 'Primary data storage' }
    ],
    security: { name: 'JWT + OAuth2', reasoning: 'Secure authentication and authorization' }
  };
}

function parseAIResponse(text) {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // If JSON parsing fails, return text as-is
  }
  return { raw: text };
}
