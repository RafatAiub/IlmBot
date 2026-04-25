# IlmBot

IlmBot is an AI-powered Islamic knowledge assistant using Retrieval-Augmented Generation (RAG).

## Features
- **User Authentication**: Secure JWT-based registration and login.
- **Article Management**: CRUD operations with AI-assisted improvements (summarization, translation, etc.).
- **RAG Service**: Vector-based document retrieval using MongoDB Atlas Vector Search.
- **LLM Gateway**: Multi-provider support (OpenAI, Gemini, Anthropic) with fallback logic and cost tracking.

## Tech Stack
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB Atlas (with Vector Search)
- **AI**: OpenAI, Google Gemini, Anthropic
- **Validation**: Joi
- **Auth**: JWT, Bcryptjs

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Configure environment variables in `.env`.
4. Run the server: `npm run dev`.
