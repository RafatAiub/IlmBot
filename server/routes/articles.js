const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { Article } = require('../models');
const { auth, admin } = require('../middleware/auth');
const ragService = require('../services/ragService');
const LLMGateway = require('../services/IlmGateway');

// Initialize LLM Gateway for AI-improvement tasks
const gateway = new LLMGateway({
  keys: {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY
  }
});

// Validation Schemas
const articleSchema = Joi.object({
  title: Joi.string().required(),
  content: Joi.string().required(),
  category: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).default([])
});

/**
 * @route   GET /articles
 * @desc    Get paginated list of articles, optionally filtered by category
 */
router.get('/', async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    const filter = category ? { category } : {};
    
    const articles = await Article.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
      .select('-embedding') // Exclude heavy embedding data
      .lean();

    const total = await Article.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        articles,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route   GET /articles/:id
 * @desc    Get a single article by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).select('-embedding').lean();
    if (!article) {
      return res.status(404).json({ status: 'error', message: 'Article not found' });
    }
    res.json({ status: 'success', data: article });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route   POST /articles
 * @desc    Create a new article (Admin only)
 */
router.post('/', auth, admin, async (req, res) => {
  try {
    const { error, value } = articleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const article = new Article({
      ...value,
      author: req.user.id
    });

    await article.save();

    // Trigger vector embedding generation in the background
    ragService.storeEmbedding(article).catch(err => 
      console.error(`Background Embedding Error for ${article._id}:`, err.message)
    );

    res.status(201).json({ status: 'success', data: article });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route   PUT /articles/:id
 * @desc    Update an existing article (Admin only)
 */
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ status: 'error', message: 'Article not found' });
    }

    // Refresh vector embedding after update
    ragService.storeEmbedding(article).catch(err => 
      console.error(`Background Embedding Update Error for ${article._id}:`, err.message)
    );

    res.json({ status: 'success', data: article });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route   DELETE /articles/:id
 * @desc    Delete an article (Admin only)
 */
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ status: 'error', message: 'Article not found' });
    }
    res.json({ status: 'success', message: 'Article deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route   POST /articles/:id/ai-improve
 * @desc    Use AI to summarize, improve, or translate an article
 */
router.post('/:id/ai-improve', auth, admin, async (req, res) => {
  try {
    const { action } = req.body;
    const article = await Article.findById(req.params.id).lean();
    
    if (!article) {
      return res.status(404).json({ status: 'error', message: 'Article not found' });
    }

    let prompt = "";
    switch (action) {
      case 'summarize':
        prompt = `Concisely summarize the following article:\n\n${article.content}`;
        break;
      case 'improve':
        prompt = `Refine and improve the clarity, flow, and grammar of the following text while maintaining its original message:\n\n${article.content}`;
        break;
      case 'translate_bn':
        prompt = `Translate the following article into Bengali (Bangla):\n\n${article.content}`;
        break;
      default:
        return res.status(400).json({ status: 'error', message: 'Invalid action. Supported: summarize, improve, translate_bn' });
    }

    const response = await gateway.generate({
      prompt,
      temperature: 0.3,
      maxTokens: 1000
    });

    res.json({
      status: 'success',
      data: {
        improved: response.text,
        tokensUsed: response.usage.totalTokens,
        provider: response.provider
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
