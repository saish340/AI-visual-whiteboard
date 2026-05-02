const DEFAULT_OBJECT_TYPE = 'rect';
const DEFAULT_GRID_SIZE = 24;

export const normalizeBoardData = (boardData = {}) => {
  const objects = (boardData.objects || []).map(normalizeObject).filter(Boolean);
  const derivedConnections = objects
    .filter((object) => object.type === 'arrow')
    .map((object) => createConnectionFromArrow(object, objects));
  const connections = normalizeConnections([...(boardData.connections || []), ...derivedConnections], objects);

  return {
    ...boardData,
    objects,
    connections
  };
};

export const normalizeObject = (object) => {
  if (!object) return null;

  const type = object.type || DEFAULT_OBJECT_TYPE;
  const normalized = {
    ...object,
    id: object.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    x: Number.isFinite(object.x) ? object.x : Number.isFinite(object.left) ? object.left : 0,
    y: Number.isFinite(object.y) ? object.y : Number.isFinite(object.top) ? object.top : 0,
    width: Number.isFinite(object.width) ? object.width : 0,
    height: Number.isFinite(object.height) ? object.height : 0,
    strokeWidth: Number.isFinite(object.strokeWidth) ? object.strokeWidth : 2,
    metadata: {
      notes: '',
      code: '',
      links: [],
      tags: [],
      ...(object.metadata || {})
    },
    rev: Number.isFinite(object.rev) ? object.rev : 0,
    updatedAt: object.updatedAt || Date.now(),
    kind: object.kind || inferObjectKind(object)
  };

  if (type === 'arrow') {
    const points = Array.isArray(object.points) ? object.points : [];
    normalized.points = points.length === 2 ? points : buildLinePoints(normalized, object);
    normalized.sourceId = object.sourceId || null;
    normalized.targetId = object.targetId || null;
    normalized.sourcePortId = object.sourcePortId || null;
    normalized.targetPortId = object.targetPortId || null;
    normalized.connectionType = object.connectionType || 'relation';
    normalized.label = object.label || '';
  }

  if (type === 'line' && Array.isArray(object.path)) {
    normalized.path = object.path;
  }

  return normalized;
};

export const normalizeConnections = (connections = [], objects = []) => {
  return connections
    .map((connection) => normalizeConnection(connection, objects))
    .filter(Boolean);
};

export const normalizeConnection = (connection, objects = []) => {
  if (!connection) return null;

  const sourceId = connection.sourceId || connection.fromId || null;
  const targetId = connection.targetId || connection.toId || null;
  const source = sourceId ? objects.find((object) => object.id === sourceId) : null;
  const target = targetId ? objects.find((object) => object.id === targetId) : null;

  return {
    id: connection.id || `${sourceId || 'source'}-${targetId || 'target'}-${Math.random().toString(36).slice(2, 8)}`,
    sourceId,
    targetId,
    sourcePortId: connection.sourcePortId || null,
    targetPortId: connection.targetPortId || null,
    type: connection.type || connection.connectionType || inferConnectionType(connection, source, target),
    label: connection.label || '',
    points: Array.isArray(connection.points) && connection.points.length === 2
      ? connection.points
      : buildConnectionPoints(source, target),
    routing: connection.routing || 'orthogonal',
    rev: Number.isFinite(connection.rev) ? connection.rev : 0,
    updatedAt: connection.updatedAt || Date.now()
  };
};

export const createConnectionFromArrow = (arrow, objects = []) => {
  const normalizedArrow = normalizeObject(arrow);
  const connection = normalizeConnection(
    {
      id: normalizedArrow.id,
      sourceId: normalizedArrow.sourceId,
      targetId: normalizedArrow.targetId,
      sourcePortId: normalizedArrow.sourcePortId,
      targetPortId: normalizedArrow.targetPortId,
      type: normalizedArrow.connectionType || normalizedArrow.type || 'relation',
      label: normalizedArrow.label || '',
      points: normalizedArrow.points,
      routing: normalizedArrow.routing
    },
    objects
  );

  return {
    ...connection,
    id: normalizedArrow.id
  };
};

export const extractSemanticGraph = (boardData = {}) => {
  const normalized = normalizeBoardData(boardData);
  const objects = normalized.objects;
  const componentCandidates = objects.filter((object) => object.type !== 'line' && object.type !== 'arrow');

  const components = componentCandidates.map((object) => {
    const label = inferLabel(object, objects);

    return {
      id: object.id,
      kind: object.kind,
      label,
      type: object.type,
      bounds: getBounds(object),
      metadata: object.metadata || {},
      rev: object.rev || 0,
      updatedAt: object.updatedAt || Date.now()
    };
  });

  const componentById = new Map(components.map((component) => [component.id, component]));

  const connections = normalized.connections.map((connection) => {
    const source = connection.sourceId ? componentById.get(connection.sourceId) : findNearestComponent(connection.points?.[0], components);
    const target = connection.targetId ? componentById.get(connection.targetId) : findNearestComponent(connection.points?.[1], components);

    return {
      ...connection,
      sourceId: source?.id || connection.sourceId || null,
      targetId: target?.id || connection.targetId || null,
      type: connection.type || inferConnectionType(connection, source, target),
      points: buildConnectionPointsFromGraph(source, target, connection.points)
    };
  });

  const clusters = buildClusters(components, connections);

  return {
    components,
    connections,
    clusters,
    context: extractContextEntries(normalized.objects)
  };
};

export const cleanupBoardData = (boardData = {}, options = {}) => {
  const normalized = normalizeBoardData(boardData);
  const graph = extractSemanticGraph(normalized);
  const gridSize = options.gridSize || DEFAULT_GRID_SIZE;
  const nextObjects = normalized.objects.map((object) => ({ ...object }));
  const clusterGroups = graph.clusters.length > 0 ? graph.clusters : [{ id: 'all', components: graph.components }];

  clusterGroups.forEach((cluster, clusterIndex) => {
    const arranged = arrangeCluster(cluster.components || [], clusterIndex, gridSize);

    arranged.forEach((entry) => {
      const objectIndex = nextObjects.findIndex((object) => object.id === entry.id);
      if (objectIndex >= 0) {
        nextObjects[objectIndex] = {
          ...nextObjects[objectIndex],
          x: entry.x,
          y: entry.y,
          left: entry.x,
          top: entry.y,
          rev: (nextObjects[objectIndex].rev || 0) + 1,
          updatedAt: Date.now()
        };
      }
    });
  });

  const nextConnections = normalized.connections.map((connection) => {
    const source = nextObjects.find((object) => object.id === connection.sourceId);
    const target = nextObjects.find((object) => object.id === connection.targetId);
    return {
      ...connection,
      points: buildConnectionPoints(source, target),
      rev: (connection.rev || 0) + 1,
      updatedAt: Date.now()
    };
  });

  return normalizeBoardData({
    ...normalized,
    objects: nextObjects,
    connections: nextConnections,
    semanticGraph: {
      ...graph,
      components: graph.components,
      connections: nextConnections,
      clusters: graph.clusters
    }
  });
};

export const searchContextEntries = (boardData = {}, query = '', filters = {}) => {
  const normalized = normalizeBoardData(boardData);
  const entries = extractContextEntries(normalized.objects);
  const queryText = query.trim().toLowerCase();

  return entries.filter((entry) => {
    const searchBlob = `${entry.title} ${entry.content} ${entry.tags.join(' ')} ${entry.elementType}`.toLowerCase();
    const matchesQuery = !queryText || searchBlob.includes(queryText);
    const matchesTag = !filters.tag || entry.tags.includes(filters.tag);
    const matchesElementId = !filters.elementId || entry.elementId === filters.elementId;

    return matchesQuery && matchesTag && matchesElementId;
  });
};

export const generateArchitectureMarkdown = (boardData = {}) => {
  const normalized = normalizeBoardData(boardData);
  const graph = extractSemanticGraph(normalized);
  const lines = [
    `# ${normalized.name || 'Untitled Board'} Architecture`,
    '',
    '## Summary',
    `- Components: ${graph.components.length}`,
    `- Connections: ${graph.connections.length}`,
    `- Clusters: ${graph.clusters.length}`,
    '',
    '## Components'
  ];

  graph.components.forEach((component) => {
    lines.push(`- ${component.label || component.kind} (${component.kind}) at ${Math.round(component.bounds.x)}, ${Math.round(component.bounds.y)}`);
  });

  lines.push('', '## Connections');

  graph.connections.forEach((connection) => {
    lines.push(`- ${connection.sourceId || 'unknown'} -> ${connection.targetId || 'unknown'} [${connection.type}] ${connection.label ? `- ${connection.label}` : ''}`.trim());
  });

  const contextEntries = graph.context;
  if (contextEntries.length > 0) {
    lines.push('', '## Context');
    contextEntries.forEach((entry) => {
      lines.push(`- ${entry.title}: ${entry.content}`);
    });
  }

  return lines.join('\n');
};

export const downloadTextFile = (content, fileName, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const inferObjectKind = (object) => {
  const text = `${String(object.text || '').trim()} ${String(object.label || '').trim()}`.toLowerCase();
  if (object.type === 'arrow') return 'connection';
  if (object.type === 'line') return 'freehand';
  if (text.includes('db') || text.includes('database')) return 'database';
  if (text.includes('queue') || text.includes('kafka') || text.includes('rabbit')) return 'queue';
  if (text.includes('auth') || text.includes('login')) return 'auth';
  if (text.includes('api') || text.includes('gateway')) return 'api';
  if (text.includes('ui') || text.includes('web') || text.includes('client')) return 'ui';
  return object.type === 'text' ? 'annotation' : 'service';
};

const inferLabel = (object, objects) => {
  if (object.text) return String(object.text).trim();

  const nearbyText = objects.find((candidate) => {
    if (candidate.type !== 'text' || !candidate.text) return false;
    const center = getCenter(object);
    return distance(center, getCenter(candidate)) < 110;
  });

  return nearbyText?.text?.trim() || object.kind || object.type;
};

const inferConnectionType = (connection, source, target) => {
  const label = `${connection.label || ''} ${source?.label || ''} ${target?.label || ''}`.toLowerCase();
  if (label.includes('auth') || label.includes('login') || label.includes('jwt')) return 'auth';
  if (label.includes('queue') || label.includes('event') || label.includes('kafka') || label.includes('rabbit')) return 'async';
  if (label.includes('db') || label.includes('database') || label.includes('write')) return 'db';
  if (label.includes('get') || label.includes('post') || label.includes('api') || label.includes('http')) return 'api';
  return connection.type || 'relation';
};

const extractContextEntries = (objects) => {
  return objects
    .filter((object) => object.metadata && (object.metadata.notes || object.metadata.code || (object.metadata.links || []).length > 0))
    .map((object) => ({
      id: `${object.id}:context`,
      elementId: object.id,
      elementType: object.type,
      title: object.text || object.kind || object.type,
      content: [object.metadata.notes, object.metadata.code].filter(Boolean).join('\n\n'),
      links: object.metadata.links || [],
      tags: object.metadata.tags || []
    }));
};

const buildClusters = (components, connections) => {
  if (components.length === 0) return [];

  const adjacency = new Map(components.map((component) => [component.id, new Set()]));
  connections.forEach((connection) => {
    if (connection.sourceId && connection.targetId) {
      adjacency.get(connection.sourceId)?.add(connection.targetId);
      adjacency.get(connection.targetId)?.add(connection.sourceId);
    }
  });

  const clusters = [];
  const visited = new Set();

  components.forEach((component) => {
    if (visited.has(component.id)) return;
    const stack = [component.id];
    const cluster = [];

    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const node = components.find((entry) => entry.id === id);
      if (!node) continue;
      cluster.push(node);
      adjacency.get(id)?.forEach((neighbor) => {
        if (!visited.has(neighbor)) stack.push(neighbor);
      });
    }

    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      components: cluster,
      bounds: getBoundsForComponents(cluster)
    });
  });

  return clusters.sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
};

const arrangeCluster = (components, clusterIndex, gridSize) => {
  if (components.length === 0) return [];

  const columns = Math.max(1, Math.ceil(Math.sqrt(components.length)));
  const cellWidth = Math.max(gridSize * 8, 180);
  const cellHeight = Math.max(gridSize * 6, 120);
  const baseX = 80 + clusterIndex * gridSize * 4;
  const baseY = 80 + clusterIndex * gridSize * 3;

  return components.map((component, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      id: component.id,
      x: baseX + column * cellWidth,
      y: baseY + row * cellHeight
    };
  });
};

const buildConnectionPoints = (source, target) => {
  if (!source || !target) {
    return [];
  }

  const start = getCenter(source);
  const end = getCenter(target);
  const middle = { x: end.x, y: start.y };
  return [start, middle, end];
};

const buildConnectionPointsFromGraph = (source, target, fallbackPoints = []) => {
  if (source && target) {
    return buildConnectionPoints(source, target);
  }

  if (Array.isArray(fallbackPoints) && fallbackPoints.length > 0) {
    return fallbackPoints;
  }

  return [];
};

const buildLinePoints = (object, fallback = {}) => {
  const start = { x: Number.isFinite(fallback.x1) ? fallback.x1 : object.x, y: Number.isFinite(fallback.y1) ? fallback.y1 : object.y };
  const end = { x: Number.isFinite(fallback.x2) ? fallback.x2 : object.x + object.width, y: Number.isFinite(fallback.y2) ? fallback.y2 : object.y + object.height };
  return [start, end];
};

const findNearestComponent = (point, components) => {
  if (!point || components.length === 0) return null;

  return components.reduce((best, component) => {
    const componentCenter = getCenter(component.bounds);
    const currentDistance = distance(point, componentCenter);
    if (!best || currentDistance < best.distance) {
      return { component, distance: currentDistance };
    }
    return best;
  }, null)?.component || null;
};

const getBounds = (object) => ({
  x: Number.isFinite(object.x) ? object.x : 0,
  y: Number.isFinite(object.y) ? object.y : 0,
  width: Number.isFinite(object.width) ? object.width : 0,
  height: Number.isFinite(object.height) ? object.height : 0
});

const getBoundsForComponents = (components) => {
  if (components.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const bounds = components.map((component) => component.bounds);
  const minX = Math.min(...bounds.map((entry) => entry.x));
  const minY = Math.min(...bounds.map((entry) => entry.y));
  const maxX = Math.max(...bounds.map((entry) => entry.x + entry.width));
  const maxY = Math.max(...bounds.map((entry) => entry.y + entry.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

const getCenter = (value) => {
  if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.width === 'number') {
    return {
      x: value.x + value.width / 2,
      y: value.y + value.height / 2
    };
  }

  return {
    x: Number.isFinite(value?.x) ? value.x : 0,
    y: Number.isFinite(value?.y) ? value.y : 0
  };
};

const distance = (a, b) => Math.sqrt(((a?.x || 0) - (b?.x || 0)) ** 2 + ((a?.y || 0) - (b?.y || 0)) ** 2);
