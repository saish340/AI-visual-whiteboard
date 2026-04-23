# API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently uses userId in request body. For production, implement JWT tokens.

---

## Board Endpoints

### Create Board
**POST** `/boards/create`

Create a new whiteboard.

**Request:**
```json
{
  "userId": "user123",
  "name": "System Architecture",
  "description": "Design for microservices"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "System Architecture",
    "description": "Design for microservices",
    "owner": "user123",
    "data": {
      "objects": [],
      "connections": []
    },
    "collaborators": [
      {
        "userId": "user123",
        "role": "admin"
      }
    ],
    "currentVersion": 1,
    "createdAt": "2024-04-23T10:00:00Z",
    "updatedAt": "2024-04-23T10:00:00Z"
  }
}
```

**Status Codes:**
- `201`: Board created successfully
- `400`: Invalid request
- `500`: Server error

---

### Get Board
**GET** `/boards/:id`

Retrieve a specific board by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "System Architecture",
    "data": {
      "objects": [
        {
          "id": "obj1",
          "type": "rect",
          "x": 100,
          "y": 100,
          "width": 150,
          "height": 80,
          "fill": "transparent",
          "stroke": "#000000",
          "strokeWidth": 2,
          "text": "API Server",
          "metadata": {
            "notes": "Handles user requests",
            "code": "",
            "links": []
          }
        }
      ],
      "connections": [
        {
          "id": "conn1",
          "fromId": "obj1",
          "toId": "obj2",
          "type": "arrow",
          "label": "HTTP"
        }
      ]
    },
    "collaborators": [],
    "currentVersion": 5
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Board not found
- `500`: Server error

---

### Get User's Boards
**GET** `/boards/user/:userId`

List all boards owned or shared with a user.

**Query Parameters:**
```
?limit=20&page=1  (Optional: pagination)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid1",
      "name": "Board 1",
      "description": "...",
      "owner": "user123",
      "data": { "objects": [...], "connections": [...] },
      "collaborators": [],
      "createdAt": "2024-04-23T10:00:00Z",
      "updatedAt": "2024-04-23T12:00:00Z"
    },
    {
      "id": "uuid2",
      "name": "Board 2",
      "...": "..."
    }
  ]
}
```

---

### Update Board
**PUT** `/boards/:id`

Update board name, description, or drawing data.

**Request:**
```json
{
  "name": "Updated Board Name",
  "description": "New description",
  "data": {
    "objects": [...],
    "connections": [...]
  }
}
```

**Response:** Same as Get Board

**Status Codes:**
- `200`: Updated successfully
- `404`: Board not found
- `400`: Invalid data
- `500`: Server error

---

### Delete Board
**DELETE** `/boards/:id`

Delete a board (only owner).

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Board deleted"
}
```

**Status Codes:**
- `200`: Deleted
- `403`: Not owner
- `404`: Board not found

---

### Add Collaborator
**POST** `/boards/:id/collaborators`

Add a user to a board.

**Request:**
```json
{
  "userId": "collaborator123",
  "email": "collab@example.com",
  "role": "editor"  // "viewer" | "editor" | "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user123",
      "email": "user@example.com",
      "role": "admin",
      "addedAt": "2024-04-23T10:00:00Z"
    },
    {
      "userId": "collaborator123",
      "email": "collab@example.com",
      "role": "editor",
      "addedAt": "2024-04-23T10:30:00Z"
    }
  ]
}
```

---

### Get Version History
**GET** `/boards/:id/history`

Retrieve all versions of a board.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "versionNumber": 3,
      "data": {...},
      "createdAt": "2024-04-23T11:00:00Z",
      "userId": "user123",
      "changeDescription": "Added API gateway"
    },
    {
      "versionNumber": 2,
      "data": {...},
      "createdAt": "2024-04-23T10:30:00Z",
      "userId": "user123",
      "changeDescription": "Auto-save"
    }
  ]
}
```

---

### Restore Board to Version
**POST** `/boards/:id/restore`

Restore board to a specific version.

**Request:**
```json
{
  "versionNumber": 2
}
```

**Response:** Same as Get Board

---

## AI Endpoints

### Analyze Board
**POST** `/ai/analyze`

Analyze board structure and get architectural insights.

**Request:**
```json
{
  "boardData": {
    "objects": [...],
    "connections": [...]
  },
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Microservices architecture with API gateway pattern",
    "patterns": [
      "Service-oriented architecture",
      "Asynchronous communication"
    ],
    "improvements": [
      "Consider adding caching layer",
      "Implement circuit breaker pattern",
      "Add monitoring and observability"
    ],
    "scalabilityConcerns": [
      "Database might become bottleneck",
      "Consider message queue for peak loads"
    ],
    "componentCount": 5,
    "connectionCount": 6
  }
}
```

---

### Get Layout Suggestions
**POST** `/ai/layout-suggestions`

Get AI-powered layout optimization suggestions.

**Request:**
```json
{
  "objects": [
    {"id": "1", "x": 10, "y": 10, "width": 100, "height": 50},
    {"id": "2", "x": 12, "y": 15, "width": 100, "height": 50}
  ],
  "connections": [
    {"fromId": "1", "toId": "2", "type": "arrow"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentLayoutScore": 45,
    "suggestedLayoutScore": 95,
    "detectedDiagramType": "flowchart",
    "algorithm": "hierarchical",
    "issues": [
      {
        "type": "overlapping",
        "severity": "high",
        "message": "2 objects are overlapping",
        "objectIds": ["1", "2"]
      }
    ],
    "suggestions": [
      {
        "type": "hierarchical-layout",
        "description": "Arrange components in layers",
        "positions": {
          "1": {"x": 100, "y": 50},
          "2": {"x": 100, "y": 200}
        }
      },
      {
        "type": "alignment",
        "description": "Align components to grid",
        "gridSize": 20
      }
    ]
  }
}
```

---

### Get API Suggestions
**POST** `/ai/api-suggestions`

Get technology and API recommendations for diagram.

**Request:**
```json
{
  "boardData": {
    "objects": [
      {"type": "rect", "text": "Frontend App"},
      {"type": "rect", "text": "API Server"},
      {"type": "rect", "text": "Database"}
    ],
    "connections": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "components": ["Frontend App", "API Server", "Database"],
    "apis": [
      {
        "name": "REST API",
        "reasoning": "For client-server communication"
      },
      {
        "name": "GraphQL",
        "reasoning": "Alternative for flexible data fetching"
      }
    ],
    "messageQueues": [
      {
        "name": "RabbitMQ",
        "reasoning": "For async task processing"
      }
    ],
    "dataLayers": [
      {
        "name": "Redis",
        "reasoning": "High-performance caching"
      },
      {
        "name": "PostgreSQL",
        "reasoning": "Primary relational database"
      }
    ],
    "security": {
      "name": "JWT + OAuth2",
      "reasoning": "Secure authentication and authorization"
    }
  }
}
```

---

## WebSocket Events

Real-time communication uses Socket.io. Connect to `http://localhost:5000`

### Client → Server Events

#### `join-room`
User joins a board collaboration.
```javascript
socket.emit('join-room', {
  boardId: 'uuid',
  userId: 'user123',
  userName: 'John Doe'
});
```

#### `draw`
User creates a new drawing object.
```javascript
socket.emit('draw', {
  boardId: 'uuid',
  object: {
    id: 'obj1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 150,
    height: 80,
    fill: 'transparent',
    stroke: '#000000'
  }
});
```

#### `update-object`
User modifies an existing object.
```javascript
socket.emit('update-object', {
  boardId: 'uuid',
  objectId: 'obj1',
  updates: { x: 200, y: 150 }
});
```

#### `delete-object`
User deletes an object.
```javascript
socket.emit('delete-object', {
  boardId: 'uuid',
  objectId: 'obj1'
});
```

#### `save-board`
Persist board state to database.
```javascript
socket.emit('save-board', {
  boardId: 'uuid',
  boardData: {
    objects: [...],
    connections: [...]
  },
  userId: 'user123'
});
```

#### `cursor-move`
Share cursor position with others.
```javascript
socket.emit('cursor-move', {
  boardId: 'uuid',
  x: 250,
  y: 180
});
```

#### `undo` / `redo`
Notify others of undo/redo action.
```javascript
socket.emit('undo', { boardId: 'uuid' });
socket.emit('redo', { boardId: 'uuid' });
```

### Server → Client Events

#### `board-loaded`
Sent when user joins room - contains full board state.
```javascript
socket.on('board-loaded', (data) => {
  console.log(data.data);  // { objects, connections }
  console.log(data.version);
});
```

#### `draw`
Another user created an object.
```javascript
socket.on('draw', (data) => {
  console.log(data.object);
  console.log(data.userId);
});
```

#### `update-object`
Another user modified an object.
```javascript
socket.on('update-object', (data) => {
  console.log(data.objectId, data.updates);
});
```

#### `delete-object`
Another user deleted an object.
```javascript
socket.on('delete-object', (data) => {
  console.log(data.objectId);
});
```

#### `user-joined`
A user joined the room.
```javascript
socket.on('user-joined', (data) => {
  console.log(data.userName, data.color);
  console.log(data.activeUsers);
});
```

#### `user-left`
A user left the room.
```javascript
socket.on('user-left', (data) => {
  console.log(data.activeUsers);
});
```

#### `cursor-move`
Another user moved cursor.
```javascript
socket.on('cursor-move', (data) => {
  console.log(data.userId, data.x, data.y);
});
```

#### `board-saved`
Board was saved to database.
```javascript
socket.on('board-saved', (data) => {
  console.log(data.timestamp, data.version);
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

### Common Error Codes

| Code | Message |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing auth |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate entry |
| 500 | Internal Server Error |

---

## Rate Limiting (Future)

Will add rate limiting per IP/user:
- 100 requests/minute for API
- 1000 WebSocket messages/minute

---

## Pagination

List endpoints support:
```
?limit=20&page=1&sort=createdAt&order=desc
```

---

## Example Usage: Complete Flow

```javascript
// 1. Create board
const boardRes = await fetch('http://localhost:5000/api/boards/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    name: 'My Board'
  })
});
const board = await boardRes.json();
console.log('Board created:', board.data.id);

// 2. Connect WebSocket
const socket = io('http://localhost:5000');
socket.emit('join-room', {
  boardId: board.data.id,
  userId: 'user123',
  userName: 'John'
});

// 3. Draw something
socket.emit('draw', {
  boardId: board.data.id,
  object: { id: '1', type: 'rect', x: 10, y: 10, width: 100, height: 50 }
});

// 4. Save board
socket.emit('save-board', {
  boardId: board.data.id,
  boardData: { objects: [...], connections: [] },
  userId: 'user123'
});

// 5. Get AI suggestions
const aiRes = await fetch('http://localhost:5000/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    boardData: { objects: [...], connections: [] }
  })
});
const suggestions = await aiRes.json();
console.log(suggestions.data);
```

