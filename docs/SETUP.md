# Setup & Installation Guide

## Prerequisites

- **Node.js**: v18+ ([Download](https://nodejs.org/))
- **MongoDB**: v4.4+ 
  - Local: [Download](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Git**: For version control
- **Gemini API Key** (Optional): For AI features
- **npm** or **yarn**: Package managers

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ai-visual-whiteboard.git
cd ai-visual-whiteboard
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Create `.env` File

Copy `.env.example` and configure:

```bash
cp .env.example .env
```

**Edit `backend/.env`:**
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/whiteboard
# For MongoDB Atlas: mongodb+srv://user:password@cluster.mongodb.net/whiteboard

# Server
PORT=5000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Gemini (Optional, for AI features)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

#### Start Backend Server

```bash
npm run dev
```

Expected output:
```
🚀 Server running in development mode on port 5000
📊 WebSocket server ready for connections
✅ MongoDB connected successfully
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Create `.env` File

```bash
cp .env.example .env
```

**Edit `frontend/.env`:**
```env
REACT_APP_API_URL=http://localhost:5000
```

#### Start Frontend Development Server

```bash
npm start
```

Expected output:
```
webpack compiled successfully
Local: http://localhost:3000
```

### 4. Access Application

Open browser and navigate to: **http://localhost:3000**

## MongoDB Setup

### Option A: Local MongoDB

**Windows:**
```bash
# Download and install MongoDB Community Edition
# Then run:
mongod
```

**macOS (with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster
4. Create database user with password
5. Whitelist IP address (0.0.0.0/0 for development)
6. Copy connection string and update `MONGODB_URI` in `.env`

Example:
```
mongodb+srv://user:password@cluster0.mongodb.net/whiteboard?retryWrites=true&w=majority
```

## Verify Installation

### Test Backend Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "Server is running",
  "timestamp": "2024-04-23T10:30:00.000Z"
}
```

### Test Frontend

1. Open http://localhost:3000 in browser
2. Create a new board
3. Try drawing tools
4. Check browser console for errors

## Troubleshooting

### Port Already in Use

**Port 5000 (Backend):**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process (macOS/Linux)
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Port 3000 (Frontend):**
```bash
# Try different port
PORT=3001 npm start
```

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Check if MongoDB is running
mongosh  # or mongo for older versions

# If error, start MongoDB:
mongod
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Connection Failed

```
Error: WebSocket is closed before the connection is established
```

**Solution:**
- Ensure backend is running on correct port (5000)
- Check `REACT_APP_API_URL` in frontend `.env`
- Check browser console for exact error

## Development Workflow

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
```

### Terminal 3: MongoDB (if local)
```bash
mongod
```

### VS Code Setup (Optional)

**Install Extensions:**
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- Thunder Client or REST Client
- MongoDB for VS Code

**Recommended Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
```

Creates optimized build in `build/` directory.

### Prepare Backend for Production

1. Create `.env.production`:
```env
MONGODB_URI=mongodb+srv://prod_user:prod_pass@prod-cluster.mongodb.net/whiteboard
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-domain.com
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

2. Set up SSL/TLS certificate
3. Configure reverse proxy (nginx)
4. Use process manager (PM2)

```bash
npm install -g pm2
pm2 start src/index.js --name "whiteboard"
pm2 save
pm2 startup
```

### Deploy to Heroku (Easy Option)

**Backend:**
```bash
# Create Heroku app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set GEMINI_API_KEY=your-gemini-api-key-here

# Deploy
git push heroku main
```

**Frontend:**
```bash
# Update REACT_APP_API_URL to production backend
# Then build and deploy to Vercel/Netlify
npm run build
```

## API Testing

### Using Thunder Client or Postman

Create Board:
```
POST http://localhost:5000/api/boards/create
Content-Type: application/json

{
  "userId": "test-user-123",
  "name": "My First Board",
  "description": "Testing the API"
}
```

Get Board:
```
GET http://localhost:5000/api/boards/{boardId}
```

Get AI Suggestions:
```
POST http://localhost:5000/api/ai/analyze
Content-Type: application/json

{
  "boardData": {
    "objects": [
      { "id": "1", "type": "rect", "x": 10, "y": 10, "width": 100, "height": 50, "text": "API Server" }
    ],
    "connections": []
  }
}
```

## Performance Testing

### Load Testing Backend

```bash
# Install autocannon
npm install -g autocannon

# Test with 50 concurrent connections
autocannon -c 50 -d 30 http://localhost:5000/health
```

### Monitor Memory Usage

```bash
# Backend memory monitoring
node --max-old-space-size=2048 src/index.js

# Frontend (check in Chrome DevTools)
```

## Next Steps

1. ✅ Application is running locally
2. 📝 Create your first board
3. 🎨 Explore drawing tools
4. 🤖 Test AI suggestions (with Gemini key)
5. 👥 Invite collaborators and test real-time sync
6. 🚀 Deploy to production when ready

## Support & Documentation

- [Backend API Reference](./API.md)
- [Frontend Development Guide](./DEVELOPMENT.md)
- [Architecture & System Design](./ARCHITECTURE.md)

