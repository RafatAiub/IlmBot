const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * User Schema
 * Handles authentication and role-based access
 */
const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Performance: do not include password in lean queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware for User timestamps
UserSchema.pre('save', function (next) {
  if (this.isNew && !this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});

/**
 * Article Schema
 * Stores knowledge base content with vector embeddings for RAG
 */
const ArticleSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: 'text'
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  embedding: {
    type: [Number], // MongoDB Atlas Vector Search array
    validate: {
      validator: (v) => Array.isArray(v),
      message: 'Embedding must be an array of numbers'
    }
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tags: {
    type: [String],
    index: true
  },
  createdAt: Date,
  updatedAt: Date
});

// Pre-save middleware for Article timestamps
ArticleSchema.pre('save', function (next) {
  const now = new Date();
  this.updatedAt = now;
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
});

// Optimized indexes for frequent queries
ArticleSchema.index({ category: 1, createdAt: -1 });

/**
 * QALog Schema
 * Tracks AI interactions, usage, and costs
 */
const QALogSchema = new Schema({
  userQuery: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  sourcesUsed: [{
    type: Schema.Types.ObjectId,
    ref: 'Article'
  }],
  tokens: {
    type: Number,
    min: 0,
    default: 0
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

/**
 * PromptTemplate Schema
 * Manages system prompts and their versions
 */
const PromptTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  systemPrompt: {
    type: String,
    required: true
  },
  description: String,
  version: {
    type: String,
    default: '1.0.0'
  },
  createdAt: Date,
  updatedAt: Date
});

// Pre-save middleware for PromptTemplate timestamps
PromptTemplateSchema.pre('save', function (next) {
  const now = new Date();
  this.updatedAt = now;
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
});

// Export Models
const User = mongoose.model('User', UserSchema);
const Article = mongoose.model('Article', ArticleSchema);
const QALog = mongoose.model('QALog', QALogSchema);
const PromptTemplate = mongoose.model('PromptTemplate', PromptTemplateSchema);

module.exports = {
  User,
  Article,
  QALog,
  PromptTemplate
};
