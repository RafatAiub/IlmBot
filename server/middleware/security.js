const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');

/**
 * 1. Helmet.js Integration
 * Secures Express apps by setting various HTTP headers
 */
const helmetConfig = helmet();

/**
 * 2. CORS Configuration
 * Restricts cross-origin resource sharing to trusted domains
 */
const corsConfig = cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

/**
 * 3. Rate Limiting for Chat API
 * Limits each IP to 20 requests per minute to prevent abuse/spam
 */
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per `window`
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after a minute.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * 4. MongoDB Sanitization
 * Prevents NoSQL injection attacks by removing forbidden characters (like $)
 */
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_'
});

/**
 * 5. Request Validation Middleware
 * Validates request body against a Joi schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    if (!schema) return next();
    
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        status: 'error',
        message: `Validation failed: ${errorMessage}`
      });
    }
    next();
  };
};

/**
 * 6. Prompt Injection Detection
 * Checks user queries against known malicious prompt injection patterns
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all previous instructions/i,
  /you are now a/i,
  /system prompt/i,
  /bypass/i,
  /jailbreak/i,
  /forget previous rules/i,
  /<\/?script>/i, // Basic XSS check
];

const detectPromptInjection = (req, res, next) => {
  if (req.body && typeof req.body.query === 'string') {
    const isSuspicious = PROMPT_INJECTION_PATTERNS.some((pattern) => 
      pattern.test(req.body.query)
    );

    if (isSuspicious) {
      console.warn(`[SECURITY] Prompt injection attempt detected. IP: ${req.ip}, Query: "${req.body.query}"`);
      return res.status(403).json({
        status: 'error',
        message: 'Suspicious input detected. Request blocked due to security policies.'
      });
    }
  }
  next();
};

/**
 * 7. Global Error Handler
 * Catch-all error handler. Masks stack traces in production.
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error internally
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;
  
  // Format response
  const response = {
    status: 'error',
    message: statusCode === 500 && isProduction 
      ? 'An unexpected internal server error occurred.' 
      : err.message
  };

  // Only append stack trace in development
  if (!isProduction && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  helmetConfig,
  corsConfig,
  chatRateLimiter,
  mongoSanitizeConfig,
  validateRequest,
  detectPromptInjection,
  globalErrorHandler
};
