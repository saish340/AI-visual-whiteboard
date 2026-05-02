# Development Guide

## Code Organization

### Frontend Structure
```
frontend/src/
├── components/          # React components
│   ├── WhiteboardPage.js    # Main board page
│   ├── Canvas.js            # Drawing canvas
│   ├── ToolBar.js           # Tools & settings
│   ├── AISuggestions.js     # AI panel
│   ├── ContextPanel.js      # Element metadata
│   ├── ActiveUsers.js       # Collaboration indicator
│   └── DashboardPage.js     # Board listing
├── store/              # Zustand state management
│   └── useStore.js     # Global application state
├── services/           # API & WebSocket
│   ├── apiService.js   # REST API calls
│   └── socketService.js # WebSocket/Socket.io
├── hooks/              # Custom React hooks (future)
├── utils/              # Helper functions
│   └── drawingUtils.js # Geometry & drawing helpers
├── App.js             # Root component
├── index.js           # Entry point
└── App.css            # Global styles
```

### Backend Structure
```
backend/src/
├── index.js              # Express server setup
├── routes/               # API endpoints
│   ├── boardRoutes.js    # Board CRUD
│   └── aiRoutes.js       # AI endpoints
├── controllers/          # Request handlers (optional refactor)
├── models/               # MongoDB schemas
│   ├── Board.js         # Board schema
│   └── Session.js       # Session schema
├── services/             # Business logic
│   ├── socketService.js # WebSocket handling
│   └── aiService.js     # AI logic
├── middleware/           # Express middleware
│   ├── errorHandler.js  # Error handling
│   └── database.js      # DB connection
└── utils/               # Helper functions
```

## Adding New Features

### Adding a New Drawing Tool

1. **Update Zustand Store** (`frontend/src/store/useStore.js`)
```javascript
// Add tool to tools array
const tools = [
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'line', icon: '—', label: 'Line' },  // New tool
];

// Add handler in store
drawLine: (startPoint, endPoint) => {
  const line = {
    type: SHAPES.LINE,
    x: startPoint.x,
    y: startPoint.y,
    points: [startPoint, endPoint],
    stroke: store.selectedColor,
    strokeWidth: store.selectedStrokeWidth
  };
  store.addObject(line);
}
```

2. **Update Canvas Component** (`frontend/src/components/Canvas.js`)
```javascript
if (store.selectedTool === TOOLS.LINE) {
  drawLine(canvas, start, transformedPoint, store.selectedColor, store.selectedStrokeWidth);
}
```

3. **Add to Drawing Utils** (`frontend/src/utils/drawingUtils.js`)
```javascript
const drawLine = (canvas, start, end, color, strokeWidth) => {
  // Implementation
};

export const TOOLS = {
  // ...
  LINE: 'line'
};
```

4. **Update ToolBar Component** (`frontend/src/components/ToolBar.js`)
```javascript
const tools = [
  { id: 'pen', icon: '✏️', label: 'Pen', shortcut: 'P' },
  { id: 'line', icon: '—', label: 'Line', shortcut: 'L' },  // New
];
```

### Adding AI Feature

1. **Create Service Function** (`backend/src/services/aiService.js`)
```javascript
export async function generateDiagramCode(boardData) {
  try {
    const prompt = `Generate PlantUML code for: ${JSON.stringify(boardData)}`;
    const response = await geminiModel.generateContent([
      'You are a diagram expert. Generate code.',
      prompt
    ]);
    return response.response.text();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

2. **Add API Route** (`backend/src/routes/aiRoutes.js`)
```javascript
router.post('/generate-code', async (req, res) => {
  try {
    const { boardData } = req.body;
    const code = await generateDiagramCode(boardData);
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

3. **Call from Frontend** (`frontend/src/services/apiService.js`)
```javascript
export const aiApi = {
  // ...
  generateCode: async (boardData) => {
    const response = await api.post('/ai/generate-code', { boardData });
    return response.data;
  }
};
```

### Adding Real-time Event

1. **Client Emit** (`frontend/src/services/socketService.js`)
```javascript
export const emitNewEvent = (boardId, data) => {
  if (socket) {
    socket.emit('new-event', { boardId, ...data });
  }
};
```

2. **Server Handler** (`backend/src/services/socketService.js`)
```javascript
socket.on('new-event', async (payload) => {
  try {
    const { boardId, ...data } = payload;
    const roomKey = `board_${boardId}`;
    
    // Process event
    // ...
    
    // Broadcast to room
    socket.to(roomKey).emit('new-event', {
      userId: socket.id,
      ...data
    });
  } catch (error) {
    console.error('Error:', error);
  }
});
```

3. **Client Listener** (`frontend/src/components/WhiteboardPage.js`)
```javascript
useEffect(() => {
  const socket = getSocket();
  socket?.on('new-event', (data) => {
    // Handle event
    console.log(data);
  });
  
  return () => {
    socket?.off('new-event');
  };
}, []);
```

## Code Style Guidelines

### JavaScript/React

**Naming Conventions:**
- `camelCase` for variables, functions
- `PascalCase` for components, classes
- `UPPER_SNAKE_CASE` for constants

```javascript
// Good
const [isDrawing, setIsDrawing] = useState(false);
const calculateDistance = (p1, p2) => { /* ... */ };
const TOOLS = { PEN: 'pen' };
const MyComponent = () => { /* ... */ };

// Bad
const [is_drawing, set_is_drawing] = useState(false);
const calculatedistance = () => { /* ... */ };
const tools = { pen: 'pen' };
const my_component = () => { /* ... */ };
```

**React Best Practices:**
```javascript
// Use functional components
const MyComponent = ({ prop1, prop2 }) => {
  // Use hooks for state
  const [state, setState] = useState(initialValue);
  
  // Use useEffect for side effects
  useEffect(() => {
    // cleanup
    return () => {};
  }, [dependencies]);
  
  return <div>Content</div>;
};

// Avoid
class MyComponent extends React.Component {
  // Don't use class components
}
```

**Imports:** Organize imports
```javascript
// 1. React/external libraries
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Store/services
import { useStore } from '../store/useStore';
import { socketService } from '../services/socketService';

// 3. Components
import Canvas from './Canvas';

// 4. Utils/styles
import { getDistance } from '../utils/drawingUtils';
import './MyComponent.css';
```

### Backend

**Error Handling:**
```javascript
// Always use try-catch with async functions
router.post('/endpoint', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      throw new APIError('Data is required', 400);
    }
    
    const result = await someAsyncOperation();
    res.json({ success: true, data: result });
  } catch (error) {
    // Error middleware will handle this
    next(error);
  }
});
```

**Logging:**
```javascript
// Always log important events
console.log('✅ Board created:', boardId);
console.log('❌ Error:', error.message);
console.log('📱 User connected:', socket.id);
console.log('📊 Stats:', { boardCount: 5 });
```

## Testing

### Frontend Unit Tests (Jest)

Create `frontend/src/utils/__tests__/drawingUtils.test.js`:
```javascript
import { getDistance, isPointInObject } from '../drawingUtils';

describe('drawingUtils', () => {
  test('getDistance calculates distance between points', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(getDistance(p1, p2)).toBe(5);
  });

  test('isPointInObject detects point inside object', () => {
    const point = { x: 50, y: 50 };
    const object = { x: 0, y: 0, width: 100, height: 100 };
    expect(isPointInObject(point, object)).toBe(true);
  });
});
```

Run tests:
```bash
cd frontend
npm test
```

### Backend Integration Tests (Jest)

Create `backend/tests/boards.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/index');

describe('Board API', () => {
  it('should create a board', async () => {
    const res = await request(app)
      .post('/api/boards/create')
      .send({
        userId: 'test-user',
        name: 'Test Board'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Board');
  });
});
```

## Debugging

### Frontend Debugging

```javascript
// React DevTools (install Chrome extension)
// Redux DevTools (if using Redux, install extension)

// Manual debugging
console.log('store state:', useStore.getState());
console.log('board data:', store.boardData);

// Use debugger
debugger;  // Execution pauses here when DevTools open
```

### Backend Debugging

```bash
# Debug with Node inspector
node --inspect-brk src/index.js

# Or use VS Code debugger
# Create .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/backend/src/index.js"
    }
  ]
}
```

### MongoDB Debugging

```bash
# Connect to MongoDB shell
mongosh

# List databases
show dbs

# Use database
use whiteboard

# View collections
show collections

# Query boards
db.boards.find()

# Find specific board
db.boards.findOne({ id: 'uuid' })

# Check sessions
db.sessions.find()
```

## Performance Optimization

### Frontend

1. **Code Splitting:** Use React.lazy()
```javascript
const AISuggestions = React.lazy(() => import('./AISuggestions'));

<Suspense fallback={<div>Loading...</div>}>
  <AISuggestions />
</Suspense>
```

2. **Memoization:** Prevent unnecessary re-renders
```javascript
const Canvas = React.memo(({ fabric }) => {
  // Component only re-renders if fabric prop changes
});

// Use useMemo for expensive calculations
const distance = useMemo(() => 
  calculateComplexDistance(p1, p2),
  [p1, p2]
);
```

3. **Debouncing:** Throttle frequent events
```javascript
const debouncedSave = useMemo(
  () => debounce((data) => saveBoard(data), 1000),
  []
);
```

### Backend

1. **Database Indexing:** Already done in models
2. **Caching:** Add Redis for frequently accessed data
3. **Connection Pooling:** Configured in MongoDB setup

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| WebSocket not connecting | Backend not running | Start backend: `npm run dev` |
| Canvas not rendering | Fabric.js not loaded | Check imports in Canvas.js |
| State not updating | Missing store dependency | Add to useEffect dependency array |
| MongoDB connection error | MongoDB not running | Start MongoDB: `mongod` |
| Slow rendering | Too many objects | Implement object virtualization |

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-tool

# Make changes and commit
git add .
git commit -m "feat: add new drawing tool"

# Push to remote
git push origin feature/new-tool

# Create pull request on GitHub
# After review and approval, merge to main
git checkout main
git merge feature/new-tool
```

## Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_LOG_LEVEL=debug  # Optional: for debugging
```

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/whiteboard
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash
LOG_LEVEL=debug  # Optional
```

## Useful Commands

```bash
# Frontend
npm start              # Start dev server
npm run build          # Build for production
npm test              # Run tests
npm run lint          # Run linter (if configured)

# Backend
npm run dev           # Start with nodemon (auto-reload)
npm start             # Start production
npm test              # Run tests

# Database
mongosh               # Connect to MongoDB
db.dropDatabase()     # Delete all data (be careful!)

# Development
git log --oneline     # View commit history
npm outdated          # Check for package updates
npm audit             # Check for vulnerabilities
```

## Next Steps for Contributors

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Set up local development environment
3. Create a feature branch
4. Implement feature following guidelines
5. Test thoroughly
6. Submit pull request with description
7. Address review feedback

## Support

For questions or issues:
- Check existing GitHub issues
- Create new issue with details
- Join Discord/Slack community (if available)
- Email: support@example.com

