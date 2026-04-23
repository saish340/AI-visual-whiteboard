# Architecture & System Design

## Overview

The AI-Powered Visual Whiteboard is built with a modular, scalable architecture designed for real-time collaboration with intelligent diagram assistance.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            React Frontend Application                │   │
│  │  ┌────────────────┬────────────────┬─────────────┐  │   │
│  │  │  Canvas        │  ToolBar       │  AI Panel   │  │   │
│  │  │  (Drawing      │  (Tools,       │  (Layout    │  │   │
│  │  │   Engine)      │   Colors)      │   Suggest.) │  │   │
│  │  └────────────────┴────────────────┴─────────────┘  │   │
│  │         ↓              ↓                  ↓          │   │
│  │  ┌─────────────────────────────────┐               │   │
│  │  │  Zustand Store (State Mgmt)     │               │   │
│  │  │  - Board State                  │               │   │
│  │  │  - Drawing Tools                │               │   │
│  │  │  - History (Undo/Redo)          │               │   │
│  │  │  - UI State                     │               │   │
│  │  └─────────────────────────────────┘               │   │
│  │         ↓              ↓                  ↓          │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │   WebSocket (Socket.io)                   │     │   │
│  │  │   - Real-time draw events                │     │   │
│  │  │   - Cursor sync                          │     │   │
│  │  │   - Collaborative updates                │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │         ↓              ↓                  ↓          │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │   API Service (REST)                      │     │   │
│  │  │   - Board CRUD                            │     │   │
│  │  │   - AI endpoints                          │     │   │
│  │  │   - Version management                    │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│              Node.js Express Backend Server                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Socket.io Server                         │   │
│  │  - Manages rooms (boards)                           │   │
│  │  - Routes real-time events                          │   │
│  │  - Handles concurrent connections                   │   │
│  │  - Broadcasts drawing updates                       │   │
│  └─────────────────────────────────────────────────────┘   │
│         ↓              ↓                  ↓                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │         API Routes & Controllers                    │    │
│  │  ┌──────────┬──────────┬──────────┬─────────────┐  │    │
│  │  │ Boards   │ AI       │ Session  │ Collab.     │  │    │
│  │  │ Routes   │ Routes   │ Routes   │ Routes      │  │    │
│  │  └──────────┴──────────┴──────────┴─────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│         ↓              ↓                  ↓                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Business Logic Services                  │    │
│  │  ┌──────────────┬──────────────┬────────────────┐  │    │
│  │  │ Socket       │ AI Service   │ Layout Engine  │  │    │
│  │  │ Service      │ (OpenAI)     │ (Auto cleanup) │  │    │
│  │  └──────────────┴──────────────┴────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│         ↓              ↓                  ↓                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │            MongoDB Database                         │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Boards Collection                            │  │    │
│  │  │ - board._id (MongoDB ID)                     │  │    │
│  │  │ - board.id (UUID for API)                    │  │    │
│  │  │ - board.data (drawing objects + connections) │  │    │
│  │  │ - board.versions (version history)           │  │    │
│  │  │ - board.collaborators (users + roles)        │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Sessions Collection (TTL index)              │  │    │
│  │  │ - sessionId (socket.id)                      │  │    │
│  │  │ - boardId, userId, userName                 │  │    │
│  │  │ - Auto-deleted after 24 hours                │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Drawing Event Flow (Real-time Collaboration)

```
User A draws shape
         ↓
Canvas local update + store.addObject()
         ↓
Emit socket 'draw' event
         ↓
Backend Socket.io receives 'draw'
         ↓
Broadcast to all users in room (except sender)
         ↓
Other users' sockets receive 'draw' event
         ↓
Frontend: store.addObject() + canvas rerender
         ↓
User A, B, C see same shape instantly
```

### 2. Save & Persistence Flow

```
Auto-save timer (30 seconds) triggers
         ↓
Emit socket 'save-board' event
         ↓
Backend updates Board in MongoDB
         ↓
Create new version entry
         ↓
Emit 'board-saved' confirmation
         ↓
Frontend: update lastSaveTime
         ↓
User sees "Saved" indicator
```

### 3. AI Suggestions Flow

```
User clicks "Get Layout Suggestions"
         ↓
Frontend: POST /api/ai/layout-suggestions
         ↓
Backend analyzes board structure
         ↓
Detects overlaps, clustering, connections
         ↓
Generates positions using layout algorithm
         ↓
Return suggestions as JSON
         ↓
Frontend displays suggestions panel
         ↓
User clicks "Apply Layout"
         ↓
Update all objects' positions locally
         ↓
Trigger auto-save
```

## Key Components

### Frontend

#### **Canvas Component**
- Uses Fabric.js for drawing
- Handles mouse events (draw, select, drag)
- Applies zoom and pan
- Renders objects from store

#### **ToolBar Component**
- Tool selection (pen, shapes, text, eraser)
- Color picker with presets + custom color
- Stroke width adjustment
- Zoom controls
- History (undo/redo)
- Status indicators

#### **Store (Zustand)**
- Centralized state management
- Board data (objects, connections)
- Drawing tools state
- History stack (with max size 50)
- UI state (sidebars, selections)
- Collaboration state (active users)

#### **Socket Service**
- Initializes Socket.io connection
- Handles real-time events:
  - `join-room`: User enters board
  - `draw`: New object created
  - `update-object`: Object modified
  - `delete-object`: Object removed
  - `save-board`: Persist to DB
  - `cursor-move`: Cursor position sync
  - `user-joined` / `user-left`: Presence
  - `undo` / `redo`: History events

#### **API Service**
- REST endpoints for:
  - Board CRUD operations
  - AI analysis and suggestions
  - Version history management
  - Collaborator management

### Backend

#### **Socket.io Service**
- Room management (one room per board)
- Active user tracking
- Event broadcasting
- Cursor position synchronization
- Handles disconnects gracefully

#### **AI Service**
- Board structure analysis
- Layout issue detection (overlaps, clustering)
- Diagram type detection (flowchart, network, etc.)
- Layout suggestion generation using:
  - **Hierarchical layout** for flowcharts
  - **Force-directed layout** for networks
  - **Grid layout** for generic diagrams
- Architecture analysis via OpenAI GPT-3.5-turbo
- API recommendations

#### **Routes**
- `POST /api/boards/create`: Create new board
- `GET /api/boards/:id`: Get board details
- `GET /api/boards/user/:userId`: List user's boards
- `PUT /api/boards/:id`: Update board
- `DELETE /api/boards/:id`: Delete board
- `POST /api/ai/analyze`: Analyze board architecture
- `POST /api/ai/layout-suggestions`: Get layout suggestions
- `POST /api/ai/api-suggestions`: Get tech recommendations

#### **Models**
- **Board**: Stores diagram, metadata, versions, collaborators
- **Session**: Tracks active users (auto-deletes after 24h)

## State Management Architecture

### Store Structure
```javascript
{
  // User
  userId, userName,
  
  // Board
  boardId, boardName, boardData: { objects, connections },
  
  // Drawing
  selectedTool, selectedColor, selectedStrokeWidth, selectedFontSize,
  
  // Canvas
  canvasWidth, canvasHeight, zoomLevel, panX, panY,
  
  // History
  history: [], historyIndex,
  
  // UI
  showToolbar, showSidebar, selectedObject, isDrawing,
  showAISuggestions, showContextPanel,
  
  // Collaboration
  activeUsers: [], cursorPositions: {},
  
  // Status
  isLoading, error, lastSaveTime
}
```

## Performance Optimizations

1. **Debouncing**: Cursor movements throttled (100ms)
2. **History Limit**: Max 50 undo states to save memory
3. **Database Indexing**: 
   - `owner + createdAt` for user boards
   - `collaborators.userId` for shared boards
   - TTL index on Sessions
4. **Connection Pooling**: MongoDB with 5-10 connection pool
5. **Compression**: HTTP response compression enabled
6. **Canvas Rendering**: Only rerender on state changes

## Error Handling & Resilience

- **Socket Reconnection**: Automatic with exponential backoff
- **API Retry**: Handled at service level
- **Offline Support**: Local state persisted; sync on reconnect
- **Database Transactions**: Version history maintains data integrity
- **Graceful Degradation**: App works without AI features

## Security Considerations

1. **WebSocket Authentication**: Validate userId in socket handlers
2. **Authorization**: Check board ownership for delete/update
3. **Input Validation**: Sanitize all API inputs
4. **Rate Limiting**: Can be added at Express middleware level
5. **CORS**: Configured for frontend URL
6. **Secrets Management**: OpenAI key in environment variables

## Scalability Path

### Current Architecture
- Single server instance
- MongoDB instance
- Suitable for 100-1000 concurrent users

### Scaling to 10k+ Users
1. **Horizontal Scaling**: Deploy multiple server instances with load balancer
2. **Redis**: Add Redis for:
   - Socket.io adapter (broadcast across servers)
   - Session caching
   - Rate limiting
3. **Database**: MongoDB sharding by boardId or userId
4. **CDN**: Serve static assets from CDN
5. **Caching**: Cache AI results, frequently accessed boards
6. **Queue System**: Use Bull/RabbitMQ for async tasks (exports, AI analysis)

### Example Scaling Setup
```
                 Load Balancer (nginx)
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Server 1          Server 2          Server 3
   (Node.js)         (Node.js)         (Node.js)
        ↓                ↓                ↓
      ┌──────────────────┼──────────────────┐
      ↓                  ↓                  ↓
   Redis (Pub/Sub + Session Store)
      ↓
   MongoDB (Sharded)
```

## Future Enhancements

1. **Video Conferencing**: Integrate Jitsi/Daily.co
2. **Comments & Annotations**: Threaded comments on elements
3. **Mobile Support**: React Native or PWA
4. **Export Formats**: PDF, SVG, PlantUML
5. **Templates**: Pre-built diagram templates
6. **Plugins**: Extensible architecture for custom shapes
7. **Analytics**: Track most-used tools, popular patterns
8. **Offline Mode**: Service worker + IndexedDB
9. **Version Comparison**: Visual diff between versions
10. **Smart Search**: Full-text search across diagrams

