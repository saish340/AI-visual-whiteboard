import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useStore } from '../store/useStore';
import { emitDeleteObject, emitDraw, emitCursorMove, emitUpdateObject } from '../services/socketService';
import { SHAPES, TOOLS } from '../utils/drawingUtils';
import './Canvas.css';

/**
 * Main Canvas component - handles drawing and rendering
 */
const Canvas = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const previewShapeRef = useRef(null);
  const startPointRef = useRef(null);
  const isShapeDrawingRef = useRef(false);
  const lastEmitTimeRef = useRef(0);
  const latestStateRef = useRef(null);

  const store = useStore();
  const objects = store.boardData.objects;
  const isDarkMode = store.isDarkMode;
  const selectedColor = store.selectedColor;
  const selectedStrokeWidth = store.selectedStrokeWidth;
  const selectedTool = store.selectedTool;
  const zoomLevel = store.zoomLevel;
  const panX = store.panX;
  const panY = store.panY;

  useEffect(() => {
    latestStateRef.current = store;
  }, [store]);

  // Initialize Fabric once
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;
    const initialState = useStore.getState();
    const size = getCanvasSize(containerRef.current, initialState);

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: size.width,
      height: size.height,
      backgroundColor: initialState.isDarkMode ? '#1e1e1e' : '#ffffff',
      isDrawingMode: initialState.selectedTool === TOOLS.PEN,
      renderOnAddRemove: true,
      selection: false,
      preserveObjectStacking: true
    });

    fabricCanvasRef.current = canvas;
    window.__whiteboardFabricCanvas = canvas;
    applyToolSettings(canvas, initialState);

    const handleMouseDown = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;
      const pointer = canvas.getPointer(evt.e);
      const tool = current.selectedTool;

      if (tool === TOOLS.PEN) {
        return;
      }

      if (tool === TOOLS.SELECT) {
        const target = canvas.findTarget(evt.e, false);
        current.setSelectedObject(target?.data?.objectId || null);
        current.setShowContextPanel(!!target?.data?.objectId);
        return;
      }

      if (tool === TOOLS.ERASER) {
        const target = canvas.findTarget(evt.e, false);
        const objectId = target?.data?.objectId;
        if (objectId) {
          current.deleteObject(objectId);
          if (current.boardId) {
            emitDeleteObject(current.boardId, objectId);
          }
        }
        return;
      }

      if (tool === TOOLS.TEXT) {
        const savedObject = current.addObject({
          type: SHAPES.TEXT,
          x: pointer.x,
          y: pointer.y,
          width: 220,
          height: current.selectedFontSize * 1.6,
          text: 'Text',
          fill: current.selectedColor,
          stroke: current.selectedColor,
          fontSize: current.selectedFontSize,
          fontFamily: 'Inter, Arial, sans-serif',
          kind: 'annotation'
        });

        current.setSelectedObject(savedObject.id);
        current.setShowContextPanel(true);
        current.setSelectedTool(TOOLS.SELECT);

        if (current.boardId) {
          emitDraw(current.boardId, savedObject);
        }
        return;
      }

      if (tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE || tool === TOOLS.ARROW) {
        isShapeDrawingRef.current = true;
        startPointRef.current = pointer;

        if (previewShapeRef.current) {
          canvas.remove(previewShapeRef.current);
          previewShapeRef.current = null;
        }
      }
    };

    const handleMouseMove = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;
      const pointer = canvas.getPointer(evt.e);
      const now = Date.now();

      if (now - lastEmitTimeRef.current > 100 && current.boardId) {
        emitCursorMove(current.boardId, pointer.x, pointer.y);
        lastEmitTimeRef.current = now;
      }

      if (!isShapeDrawingRef.current || !startPointRef.current) return;

      const start = startPointRef.current;

      if (previewShapeRef.current) {
        canvas.remove(previewShapeRef.current);
        previewShapeRef.current = null;
      }

      if (current.selectedTool === TOOLS.RECTANGLE) {
        previewShapeRef.current = new fabric.Rect({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
          fill: 'transparent',
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth,
          selectable: false,
          evented: false
        });
      } else if (current.selectedTool === TOOLS.CIRCLE) {
        const radius = Math.sqrt(
          Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2)
        ) / 2;

        previewShapeRef.current = new fabric.Circle({
          left: (start.x + pointer.x) / 2 - radius,
          top: (start.y + pointer.y) / 2 - radius,
          radius,
          fill: 'transparent',
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth,
          selectable: false,
          evented: false
        });
      } else if (current.selectedTool === TOOLS.ARROW) {
        previewShapeRef.current = new fabric.Line([start.x, start.y, pointer.x, pointer.y], {
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth,
          selectable: false,
          evented: false
        });
      }

      if (previewShapeRef.current) {
        canvas.add(previewShapeRef.current);
        canvas.requestRenderAll();
      }
    };

    const handleMouseUp = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;
      if (!isShapeDrawingRef.current || !startPointRef.current) return;

      const pointer = canvas.getPointer(evt.e);
      const start = startPointRef.current;
      let newObj = null;

      if (current.selectedTool === TOOLS.RECTANGLE) {
        newObj = {
          type: SHAPES.RECT,
          x: Math.min(start.x, pointer.x),
          y: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
          fill: 'transparent',
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth
        };
      } else if (current.selectedTool === TOOLS.CIRCLE) {
        const radius = Math.sqrt(
          Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2)
        ) / 2;

        newObj = {
          type: SHAPES.CIRCLE,
          x: (start.x + pointer.x) / 2 - radius,
          y: (start.y + pointer.y) / 2 - radius,
          width: radius * 2,
          height: radius * 2,
          fill: 'transparent',
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth
        };
      } else if (current.selectedTool === TOOLS.ARROW) {
        const semanticArrow = resolveArrowSemantics(start, pointer, current.boardData.objects);
        newObj = {
          type: SHAPES.ARROW,
          points: [
            semanticArrow.start,
            semanticArrow.end
          ],
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth
          ,
          ...semanticArrow.semantic
        };
      }

      if (previewShapeRef.current) {
        canvas.remove(previewShapeRef.current);
        previewShapeRef.current = null;
      }

      if (newObj && hasDrawableSize(newObj)) {
        const savedObject = current.addObject(newObj);
        if (current.boardId) {
          emitDraw(current.boardId, savedObject);
        }
      }

      startPointRef.current = null;
      isShapeDrawingRef.current = false;
      canvas.requestRenderAll();
    };

    const handlePathCreated = (evt) => {
      const current = latestStateRef.current;
      if (!current || current.selectedTool !== TOOLS.PEN || !evt.path) return;

      const path = evt.path;
      const pathObj = {
        type: SHAPES.LINE,
        path: JSON.parse(JSON.stringify(path.path)),
        left: path.left,
        top: path.top,
        scaleX: path.scaleX,
        scaleY: path.scaleY,
        angle: path.angle,
        pathOffset: path.pathOffset
          ? { x: path.pathOffset.x, y: path.pathOffset.y }
          : null,
        stroke: path.stroke || current.selectedColor,
        strokeWidth: path.strokeWidth || current.selectedStrokeWidth,
        strokeLineCap: path.strokeLineCap || 'round',
        strokeLineJoin: path.strokeLineJoin || 'round',
        fill: 'transparent'
      };

      const savedObject = current.addObject(pathObj);
      path.set({
        selectable: false,
        evented: false,
        data: { objectId: savedObject.id, type: savedObject.type }
      });

      if (current.boardId) {
        emitDraw(current.boardId, savedObject);
      }

      canvas.requestRenderAll();
    };

    const handleObjectModified = (evt) => {
      const current = latestStateRef.current;
      const object = evt.target;
      const objectId = object?.data?.objectId;
      if (!current || !objectId) return;

      const updates = getObjectUpdates(object);
      if (!updates) return;

      current.updateObject(objectId, updates);
      if (current.boardId) {
        emitUpdateObject(current.boardId, objectId, updates);
      }
    };

    const handleSelection = (evt) => {
      const current = latestStateRef.current;
      const objectId = evt.selected?.[0]?.data?.objectId || null;
      if (!current) return;
      current.setSelectedObject(objectId);
      current.setShowContextPanel(!!objectId);
    };

    const handleSelectionCleared = () => {
      const current = latestStateRef.current;
      if (!current) return;
      current.setSelectedObject(null);
      current.setShowContextPanel(false);
    };

    const handleMouseWheel = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;

      const event = evt.e;
      event.preventDefault();
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        const nextZoom = current.zoomLevel * (event.deltaY > 0 ? 0.9 : 1.1);
        current.setZoomLevel(nextZoom);
        return;
      }

      current.pan(-event.deltaX, -event.deltaY);
    };

    const handleKeyDown = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;
      if (evt.key === 'Delete' && current.selectedObject) {
        current.deleteObject(current.selectedObject);
        if (current.boardId) {
          emitDeleteObject(current.boardId, current.selectedObject);
        }
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:wheel', handleMouseWheel);
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:wheel', handleMouseWheel);
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.dispose();
      fabricCanvasRef.current = null;
      delete window.__whiteboardFabricCanvas;
    };
  }, []);

  // Keep Fabric sized to the visible canvas area.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const size = getCanvasSize(container, latestStateRef.current || useStore.getState());
      canvas.setDimensions(size);
      canvas.calcOffset();
      canvas.requestRenderAll();
    };

    resizeCanvas();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keep canvas options in sync with tool/theme settings
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.backgroundColor = isDarkMode ? '#1e1e1e' : '#ffffff';
    applyToolSettings(canvas, { selectedColor, selectedStrokeWidth, selectedTool });
    canvas.requestRenderAll();
  }, [isDarkMode, selectedColor, selectedStrokeWidth, selectedTool]);

  // Apply zoom and pan from the shared store to Fabric's viewport.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setViewportTransform([zoomLevel, 0, 0, zoomLevel, panX, panY]);
    canvas.requestRenderAll();
  }, [zoomLevel, panX, panY]);

  // Re-render persisted board objects
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = isDarkMode ? '#1e1e1e' : '#ffffff';
    renderObjects(canvas, objects);
    applyToolSettings(canvas, { selectedColor, selectedStrokeWidth, selectedTool });
    canvas.requestRenderAll();
  }, [objects, isDarkMode, selectedColor, selectedStrokeWidth, selectedTool]);

  return (
    <div
      ref={containerRef}
      className={`whiteboard-canvas-host ${isDarkMode ? 'dark' : ''}`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

const getCanvasSize = (container, store) => {
  const rect = container?.getBoundingClientRect();
  return {
    width: Math.max(320, Math.floor(rect?.width || store.canvasWidth || 1200)),
    height: Math.max(240, Math.floor(rect?.height || store.canvasHeight || 800))
  };
};

const applyToolSettings = (canvas, store) => {
  const isSelect = store.selectedTool === TOOLS.SELECT;
  const isEraser = store.selectedTool === TOOLS.ERASER;
  const isPen = store.selectedTool === TOOLS.PEN;
  const isText = store.selectedTool === TOOLS.TEXT;

  canvas.isDrawingMode = isPen;
  canvas.selection = isSelect;
  canvas.skipTargetFind = !(isSelect || isEraser);
  canvas.defaultCursor = isSelect ? 'default' : isEraser ? 'not-allowed' : isText ? 'text' : 'crosshair';
  canvas.hoverCursor = isSelect ? 'move' : isEraser ? 'not-allowed' : 'crosshair';

  if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  }

  canvas.freeDrawingBrush.color = store.selectedColor || '#000000';
  canvas.freeDrawingBrush.width = Math.max(1, Number(store.selectedStrokeWidth) || 1);
  canvas.freeDrawingBrush.strokeLineCap = 'round';
  canvas.freeDrawingBrush.strokeLineJoin = 'round';

  canvas.getObjects().forEach((object) => {
    object.selectable = isSelect;
    object.evented = isSelect || isEraser;
  });
};

const getObjectUpdates = (object) => {
  const type = object.data?.type;

  if (type === SHAPES.RECT) {
    return {
      x: object.left,
      y: object.top,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY,
      angle: object.angle
    };
  }

  if (type === SHAPES.CIRCLE) {
    const diameter = object.radius * 2;
    return {
      x: object.left,
      y: object.top,
      width: diameter * object.scaleX,
      height: diameter * object.scaleY,
      angle: object.angle
    };
  }

  if (type === SHAPES.TEXT) {
    return {
      x: object.left,
      y: object.top,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY,
      angle: object.angle,
      text: object.text,
      fontSize: object.fontSize,
      fill: object.fill,
      stroke: object.fill
    };
  }

  if (type === SHAPES.LINE) {
    return {
      left: object.left,
      top: object.top
    };
  }

  if (type === SHAPES.ARROW) {
    const matrix = object.calcTransformMatrix();
    const start = fabric.util.transformPoint(new fabric.Point(object.x1, object.y1), matrix);
    const end = fabric.util.transformPoint(new fabric.Point(object.x2, object.y2), matrix);
    return {
      points: [
        { x: start.x, y: start.y },
        { x: end.x, y: end.y }
      ]
    };
  }

  return null;
};

const resolveArrowSemantics = (start, end, objects) => {
  const startTarget = findNearestComponentPoint(start, objects);
  const endTarget = findNearestComponentPoint(end, objects);
  const semantic = {
    sourceId: startTarget?.id || null,
    targetId: endTarget?.id || null,
    sourcePortId: startTarget?.portId || null,
    targetPortId: endTarget?.portId || null,
    connectionType: inferConnectionTypeFromLabels(startTarget?.label, endTarget?.label),
    label: inferArrowLabel(startTarget?.label, endTarget?.label)
  };

  return {
    start: startTarget?.point || start,
    end: endTarget?.point || end,
    semantic
  };
};

const findNearestComponentPoint = (point, objects) => {
  const shapes = objects.filter((object) => object.type !== SHAPES.LINE && object.type !== SHAPES.ARROW && object.type !== SHAPES.TEXT);

  let best = null;
  shapes.forEach((object) => {
    const bounds = {
      x: Number.isFinite(object.x) ? object.x : 0,
      y: Number.isFinite(object.y) ? object.y : 0,
      width: Number.isFinite(object.width) ? object.width : 0,
      height: Number.isFinite(object.height) ? object.height : 0
    };

    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    const distance = Math.sqrt((center.x - point.x) ** 2 + (center.y - point.y) ** 2);
    if (!best || distance < best.distance) {
      best = {
        id: object.id,
        label: object.text || object.kind || object.type,
        distance,
        point: snapPointToBounds(point, bounds, center),
        portId: null
      };
    }
  });

  return best;
};

const snapPointToBounds = (point, bounds, center) => {
  const left = { x: bounds.x, y: Math.min(Math.max(point.y, bounds.y), bounds.y + bounds.height) };
  const right = { x: bounds.x + bounds.width, y: Math.min(Math.max(point.y, bounds.y), bounds.y + bounds.height) };
  const top = { x: Math.min(Math.max(point.x, bounds.x), bounds.x + bounds.width), y: bounds.y };
  const bottom = { x: Math.min(Math.max(point.x, bounds.x), bounds.x + bounds.width), y: bounds.y + bounds.height };
  const options = [left, right, top, bottom];

  return options.reduce((best, candidate) => {
    const distance = Math.sqrt((candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2);
    if (!best || distance < best.distance) {
      return { ...candidate, distance };
    }
    return best;
  }, { ...center, distance: Infinity });
};

const inferConnectionTypeFromLabels = (sourceLabel = '', targetLabel = '') => {
  const label = `${sourceLabel} ${targetLabel}`.toLowerCase();
  if (label.includes('auth') || label.includes('login')) return 'auth';
  if (label.includes('db') || label.includes('database')) return 'db';
  if (label.includes('queue') || label.includes('event') || label.includes('kafka')) return 'async';
  if (label.includes('api') || label.includes('get') || label.includes('post')) return 'api';
  return 'relation';
};

const inferArrowLabel = (sourceLabel = '', targetLabel = '') => {
  const label = `${sourceLabel} ${targetLabel}`.toLowerCase();
  if (label.includes('auth')) return 'Auth flow';
  if (label.includes('db')) return 'DB write';
  if (label.includes('queue') || label.includes('event')) return 'Async event';
  if (label.includes('api')) return 'API call';
  return '';
};

const hasDrawableSize = (object) => {
  if (object.type === SHAPES.ARROW) {
    const [start, end] = object.points || [];
    return !!start && !!end && (start.x !== end.x || start.y !== end.y);
  }

  return (object.width || 0) > 0 || (object.height || 0) > 0;
};

const renderObjects = (canvas, objects) => {
  const isSelect = canvas.selection;

  objects.forEach((obj) => {
    if (obj.type === SHAPES.RECT) {
      canvas.add(
        new fabric.Rect({
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          fill: obj.fill || 'transparent',
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          selectable: isSelect,
          evented: isSelect,
          data: { objectId: obj.id, type: obj.type }
        })
      );
    } else if (obj.type === SHAPES.CIRCLE) {
      canvas.add(
        new fabric.Circle({
          left: obj.x,
          top: obj.y,
          radius: (obj.width || 0) / 2,
          fill: obj.fill || 'transparent',
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          selectable: isSelect,
          evented: isSelect,
          data: { objectId: obj.id, type: obj.type }
        })
      );
    } else if (obj.type === SHAPES.ARROW && Array.isArray(obj.points) && obj.points.length === 2) {
      canvas.add(
        new fabric.Line([obj.points[0].x, obj.points[0].y, obj.points[1].x, obj.points[1].y], {
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          selectable: isSelect,
          evented: isSelect,
          data: { objectId: obj.id, type: obj.type }
        })
      );
    } else if (obj.type === SHAPES.LINE) {
      const legacySvgPath =
        typeof obj.path === 'string'
          ? obj.path.match(/d=["']([^"']+)["']/)?.[1]
          : null;
      const pathData =
        Array.isArray(obj.path)
          ? obj.path
          : legacySvgPath || (typeof obj.path === 'string' ? obj.path : null);

      if (pathData) {
        const pathObject = new fabric.Path(pathData, {
          left: obj.left || 0,
          top: obj.top || 0,
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1,
          angle: obj.angle || 0,
          fill: obj.fill || 'transparent',
          stroke: obj.stroke || '#000000',
          strokeWidth: obj.strokeWidth || 2,
          strokeLineCap: obj.strokeLineCap || 'round',
          strokeLineJoin: obj.strokeLineJoin || 'round',
          selectable: isSelect,
          evented: isSelect,
          data: { objectId: obj.id, type: obj.type }
        });

        if (obj.pathOffset && typeof obj.pathOffset.x === 'number' && typeof obj.pathOffset.y === 'number') {
          pathObject.pathOffset = new fabric.Point(obj.pathOffset.x, obj.pathOffset.y);
        }

        canvas.add(pathObject);
      } else if (Array.isArray(obj.points) && obj.points.length === 2) {
        canvas.add(
          new fabric.Line([obj.points[0].x, obj.points[0].y, obj.points[1].x, obj.points[1].y], {
            stroke: obj.stroke || '#000000',
            strokeWidth: obj.strokeWidth || 2,
            selectable: isSelect,
            evented: isSelect,
            data: { objectId: obj.id, type: obj.type }
          })
        );
      }
    } else if (obj.type === SHAPES.TEXT) {
      canvas.add(
        new fabric.IText(obj.text || 'Text', {
          left: obj.x,
          top: obj.y,
          width: obj.width || 220,
          fill: obj.fill || obj.stroke || '#000000',
          fontFamily: obj.fontFamily || 'Inter, Arial, sans-serif',
          fontSize: obj.fontSize || 16,
          angle: obj.angle || 0,
          selectable: isSelect,
          evented: isSelect,
          data: { objectId: obj.id, type: obj.type }
        })
      );
    }
  });
};

export default Canvas;
