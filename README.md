# AI-Powered Visual Whiteboard

A production-ready collaborative whiteboard application with real-time synchronization, intelligent diagram assistance, and advanced features like auto-layout and AI architecture suggestions.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn
- Gemini API key (optional, for AI features)

### Setup

1. **Clone & Install**
```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

2. **Configure Environment**
```bash
# Backend/.env
MONGODB_URI=mongodb://localhost:27017/whiteboard
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash

# Frontend/.env
REACT_APP_API_URL=http://localhost:5000
```

3. **Run**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start
```

4. **Access**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
ai-visual-whiteboard/
├── backend/
│   ├── src/
│   │   ├── models/           # MongoDB schemas
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic (drawing, AI, layout)
│   │   ├── middleware/        # Auth, error handling
│   │   ├── utils/             # Helpers
│   │   └── index.js          # Server entry
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # Zustand state
│   │   ├── services/          # API & WebSocket clients
│   │   ├── utils/             # Helper functions
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── docs/                      # Architecture & guides
└── README.md
```

## 🎯 Core Features

- ✅ Real-time collaborative drawing
- ✅ Multiple drawing tools (pen, shapes, text, eraser)
- ✅ Undo/Redo functionality
- ✅ WebSocket-based synchronization
- ✅ Smart layout cleanup & auto-alignment
- ✅ AI architecture suggestions
- ✅ Element metadata & context layer
- ✅ Export to PNG/PDF
- ✅ Dark mode support
- ✅ Keyboard shortcuts

## 🏗️ Architecture

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed system design and data flow diagrams.

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Development Guide](./docs/DEVELOPMENT.md)

## 🔑 Key Technologies

- **Frontend**: React, Fabric.js, Zustand, Socket.io-client
- **Backend**: Express, Socket.io, MongoDB, Gemini API
- **DevOps**: Docker (optional), nginx

## 📦 Deployment

Ready for deployment to Heroku, AWS, DigitalOcean, etc.
See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for instructions.
