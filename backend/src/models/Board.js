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
      kind: String,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      angle: Number,
      fill: String,
      stroke: String,
      strokeWidth: Number,
      strokeLineCap: String,
      strokeLineJoin: String,
      path: mongoose.Schema.Types.Mixed,
      left: Number,
      top: Number,
      scaleX: Number,
      scaleY: Number,
      pathOffset: mongoose.Schema.Types.Mixed,
      points: [{
        x: Number,
        y: Number
      }],
      text: String,
      fontFamily: String,
      fontSize: Number,
      label: String,
      sourceId: String,
      targetId: String,
      sourcePortId: String,
      targetPortId: String,
      connectionType: String,
      routing: String,
      rev: Number,
      updatedAt: Date,
      metadata: {
        notes: String,
        code: String,
        links: [String],
        tags: [String]
      }
    }],
    connections: [{
      id: String,
      sourceId: String,
      targetId: String,
      sourcePortId: String,
      targetPortId: String,
      fromId: String,
      toId: String,
      type: String,
      label: String,
      points: [mongoose.Schema.Types.Mixed],
      routing: String,
      rev: Number,
      updatedAt: Date
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
