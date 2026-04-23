/**
 * Utility functions for drawing and geometry operations
 */

export const TOOLS = {
  PEN: 'pen',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  ERASER: 'eraser',
  SELECT: 'select'
};

export const SHAPES = {
  RECT: 'rect',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  LINE: 'line'
};

/**
 * Check if point is inside object
 */
export const isPointInObject = (point, object) => {
  const { x: px, y: py } = point;
  const { x, y, width, height } = object;

  return (
    px >= x &&
    px <= x + width &&
    py >= y &&
    py <= y + height
  );
};

/**
 * Get distance between two points
 */
export const getDistance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate bounding box for multiple objects
 */
export const getBoundingBox = (objects) => {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  objects.forEach(obj => {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

/**
 * Check if objects overlap
 */
export const doObjectsOverlap = (obj1, obj2) => {
  const padding = 0;
  return !(
    obj1.x + obj1.width + padding < obj2.x ||
    obj2.x + obj2.width + padding < obj1.x ||
    obj1.y + obj1.height + padding < obj2.y ||
    obj2.y + obj2.height + padding < obj1.y
  );
};

/**
 * Snap point to grid
 */
export const snapToGrid = (point, gridSize = 20) => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
};

/**
 * Export canvas to PNG
 */
export const exportCanvasToPNG = (canvas, fileName = 'whiteboard.png') => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export canvas to JSON
 */
export const exportToJSON = (boardData, fileName = 'whiteboard.json') => {
  const jsonString = JSON.stringify(boardData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Calculate canvas position relative to page
 */
export const getCanvasCoordinates = (event, canvas) => {
  if (!canvas) return { x: 0, y: 0 };
  
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

/**
 * Apply transformation to point (zoom, pan)
 */
export const transformPoint = (point, zoomLevel, panX, panY) => {
  return {
    x: (point.x - panX) / zoomLevel,
    y: (point.y - panY) / zoomLevel
  };
};

/**
 * Reverse transformation
 */
export const reverseTransformPoint = (point, zoomLevel, panX, panY) => {
  return {
    x: point.x * zoomLevel + panX,
    y: point.y * zoomLevel + panY
  };
};

/**
 * Clamp value between min and max
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
