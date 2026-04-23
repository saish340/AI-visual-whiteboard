import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useStore } from '../store/useStore';
import { emitDeleteObject, emitDraw, emitCursorMove } from '../services/socketService';
import { SHAPES, TOOLS } from '../utils/drawingUtils';
import './Canvas.css';

/**
 * Main Canvas component - handles drawing and rendering
 */
const Canvas = () => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const previewShapeRef = useRef(null);
  const startPointRef = useRef(null);
  const isShapeDrawingRef = useRef(false);
  const lastEmitTimeRef = useRef(0);
  const latestStateRef = useRef(null);

  const store = useStore();

  useEffect(() => {
    latestStateRef.current = store;
  }, [store]);

  // Initialize Fabric once
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: store.canvasWidth,
      height: store.canvasHeight,
      backgroundColor: store.isDarkMode ? '#1e1e1e' : '#ffffff',
      isDrawingMode: false,
      selection: store.selectedTool === TOOLS.SELECT
    });

    fabricCanvasRef.current = canvas;

    const handleMouseDown = (evt) => {
      const current = latestStateRef.current;
      if (!current) return;
      const pointer = canvas.getPointer(evt.e);
      const tool = current.selectedTool;

      if (tool === TOOLS.PEN) {
        canvas.isDrawingMode = true;
        return;
      }

      if (tool === TOOLS.SELECT) {
        const target = canvas.findTarget(evt.e, false);
        current.setSelectedObject(target?.data?.objectId || null);
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
        newObj = {
          type: SHAPES.ARROW,
          points: [
            { x: start.x, y: start.y },
            { x: pointer.x, y: pointer.y }
          ],
          stroke: current.selectedColor,
          strokeWidth: current.selectedStrokeWidth
        };
      }

      if (previewShapeRef.current) {
        canvas.remove(previewShapeRef.current);
        previewShapeRef.current = null;
      }

      if (newObj) {
        current.addObject(newObj);
        if (current.boardId) {
          emitDraw(current.boardId, newObj);
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
        path: path.path,
        left: path.left,
        top: path.top,
        stroke: path.stroke || current.selectedColor,
        strokeWidth: path.strokeWidth || current.selectedStrokeWidth,
        fill: 'transparent'
      };

      canvas.remove(path);
      current.addObject(pathObj);
      if (current.boardId) {
        emitDraw(current.boardId, pathObj);
      }
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
    canvas.on('path:created', handlePathCreated);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('path:created', handlePathCreated);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Keep canvas options in sync with tool/theme settings
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setWidth(store.canvasWidth);
    canvas.setHeight(store.canvasHeight);
    canvas.backgroundColor = store.isDarkMode ? '#1e1e1e' : '#ffffff';
    canvas.isDrawingMode = store.selectedTool === TOOLS.PEN;
    canvas.selection = store.selectedTool === TOOLS.SELECT;

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = store.selectedColor;
      canvas.freeDrawingBrush.width = store.selectedStrokeWidth;
    }

    canvas.requestRenderAll();
  }, [
    store.canvasHeight,
    store.canvasWidth,
    store.isDarkMode,
    store.selectedColor,
    store.selectedStrokeWidth,
    store.selectedTool
  ]);

  // Re-render persisted board objects
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = store.isDarkMode ? '#1e1e1e' : '#ffffff';
    renderObjects(canvas, store.boardData.objects);
    canvas.requestRenderAll();
  }, [store.boardData.objects, store.isDarkMode]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className={`drawing-canvas ${store.isDarkMode ? 'dark' : ''}`}
      />
    </div>
  );
};

const renderObjects = (canvas, objects) => {
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
          selectable: false,
          evented: false,
          data: { objectId: obj.id }
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
          selectable: false,
          evented: false,
          data: { objectId: obj.id }
        })
      );
    } else if (obj.type === SHAPES.ARROW && Array.isArray(obj.points) && obj.points.length === 2) {
      canvas.add(
        new fabric.Line([obj.points[0].x, obj.points[0].y, obj.points[1].x, obj.points[1].y], {
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          selectable: false,
          evented: false,
          data: { objectId: obj.id }
        })
      );
    } else if (obj.type === SHAPES.LINE && obj.path) {
      const pathData = Array.isArray(obj.path) ? obj.path : undefined;
      if (!pathData) return;
      canvas.add(
        new fabric.Path(pathData, {
          left: obj.left || 0,
          top: obj.top || 0,
          fill: 'transparent',
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          selectable: false,
          evented: false,
          data: { objectId: obj.id }
        })
      );
    }
  });
};

export default Canvas;
