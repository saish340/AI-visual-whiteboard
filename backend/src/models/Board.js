import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled Board'
  },
  description: String,
  owner: {
    type: String,
    required: true
  },
  data: {
    objects: [{
      id: String,
      type: String,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      angle: Number,
      fill: String,
      stroke: String,
      strokeWidth: Number,
      text: String,
      fontFamily: String,
      fontSize: Number,
      metadata: {
        notes: String,
        code: String,
        links: [String],
        tags: [String]
      }
    }],
    connections: [{
      fromId: String,
      toId: String,
      type: String,
      label: String
    }]
  },
  // Collaboration features
  collaborators: [{
    userId: String,
    email: String,
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  // Version history
  versions: [{
    versionNumber: Number,
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now
    },
    userId: String,
    changeDescription: String
  }],
  currentVersion: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for queries
boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ 'collaborators.userId': 1 });

export const Board = mongoose.model('Board', boardSchema);
