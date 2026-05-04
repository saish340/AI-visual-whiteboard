import { v4 as uuidv4 } from 'uuid';
import {
  downloadTextFile,
  normalizeBoardData,
  normalizeConnection,
  normalizeObject
} from './boardGraph';

const makeNode = (id, label, x, y, width = 180, height = 70, color = '#2563eb') => ({
  id,
  type: 'rect',
  x,
  y,
  width,
  height,
  fill: 'transparent',
  stroke: color,
  strokeWidth: 2,
  metadata: {
    notes: label,
    code: '',
    links: [],
    tags: [id]
  }
});

const makeLabel = (id, text, x, y, width = 180) => ({
  id,
  type: 'text',
  x,
  y,
  width,
  height: 30,
  text,
  fill: '#111827',
  stroke: '#111827',
  fontSize: 18,
  kind: 'annotation'
});

const TEMPLATE_LIBRARY = [
  {
    id: 'blank',
    name: 'Blank Board',
    description: 'Start from scratch with an empty canvas.',
    objects: [],
    connections: []
  },
  {
    id: 'system-architecture',
    name: 'System Architecture',
    description: 'A starter layout for frontend, backend, data, and auth flows.',
    objects: [
      makeNode('frontend', 'Frontend App', 80, 140, 190, 80, '#0f766e'),
      makeLabel('frontend-label', 'Frontend App', 105, 165, 150),
      makeNode('api', 'API Gateway', 320, 140, 180, 80, '#2563eb'),
      makeLabel('api-label', 'API Gateway', 345, 165, 130),
      makeNode('auth', 'Auth Service', 560, 100, 180, 80, '#7c3aed'),
      makeLabel('auth-label', 'Auth Service', 585, 125, 140),
      makeNode('services', 'Core Services', 560, 220, 180, 80, '#ea580c'),
      makeLabel('services-label', 'Core Services', 580, 245, 140),
      makeNode('database', 'Database', 820, 120, 180, 80, '#0891b2'),
      makeLabel('database-label', 'Database', 855, 145, 110),
      makeNode('queue', 'Queue / Events', 820, 240, 180, 80, '#dc2626'),
      makeLabel('queue-label', 'Queue / Events', 842, 265, 140)
    ],
    connections: [
      { id: 'frontend-api', sourceId: 'frontend', targetId: 'api', type: 'api', label: 'HTTP' },
      { id: 'api-auth', sourceId: 'api', targetId: 'auth', type: 'auth', label: 'JWT' },
      { id: 'api-services', sourceId: 'api', targetId: 'services', type: 'relation', label: 'Commands' },
      { id: 'services-database', sourceId: 'services', targetId: 'database', type: 'db', label: 'Reads/Writes' },
      { id: 'services-queue', sourceId: 'services', targetId: 'queue', type: 'async', label: 'Events' }
    ]
  },
  {
    id: 'product-brainstorm',
    name: 'Product Brainstorm',
    description: 'A lightweight layout for ideas, risks, and roadmap planning.',
    objects: [
      makeNode('problem', 'Problem', 90, 120, 190, 80, '#b45309'),
      makeLabel('problem-label', 'Problem', 140, 145, 90),
      makeNode('users', 'Users', 340, 120, 190, 80, '#16a34a'),
      makeLabel('users-label', 'Users', 400, 145, 70),
      makeNode('ideas', 'Ideas', 590, 120, 190, 80, '#2563eb'),
      makeLabel('ideas-label', 'Ideas', 650, 145, 70),
      makeNode('risks', 'Risks', 840, 120, 190, 80, '#dc2626'),
      makeLabel('risks-label', 'Risks', 905, 145, 70),
      makeNode('next', 'Next Steps', 340, 270, 400, 80, '#7c3aed'),
      makeLabel('next-label', 'Next Steps', 470, 295, 140)
    ],
    connections: [
      { id: 'problem-users', sourceId: 'problem', targetId: 'users', type: 'relation', label: 'Affects' },
      { id: 'users-ideas', sourceId: 'users', targetId: 'ideas', type: 'relation', label: 'Feedback' },
      { id: 'ideas-risks', sourceId: 'ideas', targetId: 'risks', type: 'relation', label: 'Tradeoffs' },
      { id: 'ideas-next', sourceId: 'ideas', targetId: 'next', type: 'relation', label: 'Plan' }
    ]
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    description: 'A starter flow for ingestion, processing, storage, and reporting.',
    objects: [
      makeNode('source', 'Source', 80, 160, 170, 80, '#0f766e'),
      makeLabel('source-label', 'Source', 125, 185, 80),
      makeNode('ingest', 'Ingest', 320, 160, 170, 80, '#2563eb'),
      makeLabel('ingest-label', 'Ingest', 372, 185, 70),
      makeNode('process', 'Process', 560, 160, 170, 80, '#ea580c'),
      makeLabel('process-label', 'Process', 605, 185, 80),
      makeNode('warehouse', 'Warehouse', 800, 160, 170, 80, '#0891b2'),
      makeLabel('warehouse-label', 'Warehouse', 835, 185, 110),
      makeNode('dashboard', 'Dashboard', 1040, 160, 170, 80, '#7c3aed'),
      makeLabel('dashboard-label', 'Dashboard', 1078, 185, 100)
    ],
    connections: [
      { id: 'source-ingest', sourceId: 'source', targetId: 'ingest', type: 'async', label: 'Batch' },
      { id: 'ingest-process', sourceId: 'ingest', targetId: 'process', type: 'async', label: 'Normalize' },
      { id: 'process-warehouse', sourceId: 'process', targetId: 'warehouse', type: 'db', label: 'Store' },
      { id: 'warehouse-dashboard', sourceId: 'warehouse', targetId: 'dashboard', type: 'api', label: 'Report' }
    ]
  }
];

export const BOARD_TEMPLATES = TEMPLATE_LIBRARY;

export const getBoardTemplate = (templateId) => BOARD_TEMPLATES.find((template) => template.id === templateId) || BOARD_TEMPLATES[0];

export const createBoardFromTemplate = (templateId, boardName) => {
  const template = getBoardTemplate(templateId);
  return cloneTemplateBoardData(template, boardName);
};

export const getTemplatePatch = (templateId) => {
  const template = getBoardTemplate(templateId);
  const clonedTemplate = cloneTemplateBoardData(template);

  return {
    objects: clonedTemplate.objects,
    connections: clonedTemplate.connections
  };
};

export const mergeTemplateIntoBoardData = (boardData, templateId) => {
  const clonedTemplate = getTemplatePatch(templateId);
  return normalizeBoardData({
    ...normalizeBoardData(boardData),
    objects: [...(boardData?.objects || []), ...clonedTemplate.objects],
    connections: [...(boardData?.connections || []), ...clonedTemplate.connections]
  });
};

export const searchBoardContent = (boardData = {}, query = '') => {
  const normalized = normalizeBoardData(boardData);
  const queryText = query.trim().toLowerCase();
  const matches = [];

  normalized.objects.forEach((object) => {
    const tags = object.metadata?.tags || [];
    const comments = Array.isArray(object.metadata?.comments) ? object.metadata.comments : [];
    const blob = [
      object.text,
      object.kind,
      object.type,
      object.metadata?.notes,
      object.metadata?.code,
      object.metadata?.links?.join(' '),
      tags.join(' '),
      comments.map((comment) => comment.text).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();

    if (!queryText || blob.includes(queryText)) {
      matches.push({
        id: object.id,
        objectId: object.id,
        type: 'object',
        title: object.text || object.kind || object.type,
        description: object.metadata?.notes || object.kind || object.type,
        tags
      });
    }

    comments.forEach((comment) => {
      const commentBlob = `${comment.userName || 'User'} ${comment.text}`.toLowerCase();
      if (!queryText || commentBlob.includes(queryText)) {
        matches.push({
          id: comment.id || `${object.id}:comment:${matches.length}`,
          objectId: object.id,
          type: 'comment',
          title: `${comment.userName || 'User'} comment`,
          description: comment.text,
          userName: comment.userName,
          createdAt: comment.createdAt
        });
      }
    });
  });

  normalized.connections.forEach((connection) => {
    const blob = [connection.label, connection.type, connection.sourceId, connection.targetId].filter(Boolean).join(' ').toLowerCase();
    if (!queryText || blob.includes(queryText)) {
      matches.push({
        id: connection.id,
        connectionId: connection.id,
        type: 'connection',
        title: connection.label || `${connection.sourceId || 'source'} → ${connection.targetId || 'target'}`,
        description: connection.type || 'connection'
      });
    }
  });

  return matches;
};

export const exportCanvasToSVG = (canvas, fileName = 'whiteboard.svg') => {
  if (!canvas?.toSVG) {
    return false;
  }

  const svg = canvas.toSVG({ suppressPreamble: false });
  downloadTextFile(svg, fileName, 'image/svg+xml');
  return true;
};

export const getBoardShareUrl = (boardId) => {
  if (typeof window === 'undefined') {
    return `/board/${boardId}`;
  }

  return `${window.location.origin}/board/${boardId}`;
};

export const copyTextToClipboard = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== 'undefined') {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return true;
  }

  return false;
};

export const readBoardDataFromFile = async (file) => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const payload = parsed.data || parsed.boardData || parsed;

  return {
    boardData: normalizeBoardData(payload),
    boardName: parsed.name || payload.name || file.name.replace(/\.[^.]+$/, '')
  };
};

const cloneTemplateBoardData = (template, boardName) => {
  const idMap = new Map();
  const remapId = (id) => {
    if (!idMap.has(id)) {
      idMap.set(id, `${id}-${uuidv4().slice(0, 8)}`);
    }
    return idMap.get(id);
  };

  const objects = template.objects.map((object) => {
    const nextObject = JSON.parse(JSON.stringify(object));
    if (nextObject.id) {
      nextObject.id = remapId(nextObject.id);
    }
    return normalizeObject(nextObject);
  });

  const connections = template.connections.map((connection) => {
    const nextConnection = JSON.parse(JSON.stringify(connection));
    if (nextConnection.id) nextConnection.id = remapId(nextConnection.id);
    if (nextConnection.sourceId) nextConnection.sourceId = remapId(nextConnection.sourceId);
    if (nextConnection.targetId) nextConnection.targetId = remapId(nextConnection.targetId);
    return normalizeConnection(nextConnection, objects);
  });

  return normalizeBoardData({
    name: boardName || template.name,
    description: template.description,
    objects,
    connections
  });
};