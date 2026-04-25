const { Article } = require('../models');
const LLMGateway = require('./IlmGateway');

/**
 * RAG Service
 * Orchestrates Retrieval-Augmented Generation using MongoDB Atlas Vector Search
 */
class RAGService {
  constructor() {
    this.gateway = new LLMGateway({
      keys: {
        openai: process.env.OPENAI_API_KEY,
        gemini: process.env.GEMINI_API_KEY
      }
    });
  }

  /**
   * 1. Generate embeddings for a given text
   * @param {string} text 
   * @returns {Promise<number[]>}
   */
  async embedText(text) {
    try {
      console.debug('RAGService: Generating embedding...');
      return await this.gateway.embed(text);
    } catch (error) {
      console.error('RAGService: embedText failed:', error.message);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * 2. Generate and store embedding for an article
   * @param {Object} article - Mongoose article document or object with title/content
   * @returns {Promise<Object>}
   */
  async storeEmbedding(article) {
    try {
      const textToEmbed = `${article.title}\n\n${article.content}`;
      const embedding = await this.embedText(textToEmbed);

      const updatedArticle = await Article.findByIdAndUpdate(
        article._id,
        { embedding },
        { new: true }
      );

      console.info(`RAGService: Successfully stored embedding for article: ${article._id}`);
      return updatedArticle;
    } catch (error) {
      console.error(`RAGService: storeEmbedding failed for ${article._id}:`, error.message);
      throw error;
    }
  }

  /**
   * 3. Find top-5 most relevant articles using MongoDB Vector Search
   * @param {string} query - User's search query
   * @returns {Promise<Array>}
   */
  async retrieveRelevantDocs(query) {
    try {
      const queryVector = await this.embedText(query);

      console.debug('RAGService: Executing MongoDB Vector Search aggregation...');
      const docs = await Article.aggregate([
        {
          $vectorSearch: {
            index: "vector_index", // Name of the Atlas Vector Search index
            path: "embedding",
            queryVector: queryVector,
            numCandidates: 100,
            limit: 5
          }
        },
        {
          $project: {
            title: 1,
            content: 1,
            category: 1,
            tags: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      console.info(`RAGService: Retrieved ${docs.length} relevant documents`);
      return docs;
    } catch (error) {
      console.error('RAGService: retrieveRelevantDocs failed:', error.message);
      throw error;
    }
  }

  /**
   * 4. RAG Logic: Combine retrieval and generation
   * @param {string} query - User query
   * @returns {Promise<Object>}
   */
  async generateAnswer(query) {
    try {
      // Step A: Retrieve context
      const docs = await this.retrieveRelevantDocs(query);
      
      if (!docs || docs.length === 0) {
        return {
          answer: "I couldn't find any specific information in my knowledge base to answer your question accurately.",
          sources: []
        };
      }

      // Step B: Build context string
      const context = docs
        .map((doc, i) => `[Source ${i + 1}]: ${doc.title}\n${doc.content}`)
        .join('\n\n---\n\n');

      const systemPrompt = `You are IlmBot, an expert AI assistant focused on providing accurate information based on the provided Islamic knowledge base.
      
      INSTRUCTIONS:
      1. Answer the user's question ONLY using the provided sources.
      2. If the answer is not in the sources, say you don't have enough information.
      3. Cite your sources in the text using bracketed numbers, e.g., [1] or [2].
      4. Maintain a respectful, scholarly, and helpful tone.

      SOURCES:
      ${context}`;

      // Step C: Call LLM Gateway for generation
      console.debug('RAGService: Calling LLM Gateway for final answer...');
      const llmResponse = await this.gateway.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.2, // Low temperature for consistency and accuracy
        maxTokens: 800
      });

      // Step D: Format and return
      return this.formatResponse(llmResponse.text, docs);
    } catch (error) {
      console.error('RAGService: generateAnswer failed:', error.message);
      throw error;
    }
  }

  /**
   * 5. Format the final response with citations
   * @param {string} answer 
   * @param {Array} docs 
   * @returns {Object}
   */
  formatResponse(answer, docs) {
    return {
      answer,
      sources: docs.map((doc, i) => ({
        index: i + 1,
        id: doc._id,
        title: doc.title,
        category: doc.category,
        relevance: doc.score
      })),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new RAGService();
