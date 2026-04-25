import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 */

/**
 * @typedef {Object} Article
 * @property {string} _id
 * @property {string} title
 * @property {string} content
 * @property {string} category
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} role 'user' | 'assistant'
 * @property {string} content
 */

// ==========================================
// ASYNC THUNKS
// ==========================================

/**
 * Authenticate user and get token
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, Object, {}>}
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      return data.data; // { token, user }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Fetch paginated articles
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, { page: number, category?: string }, {}>}
 */
export const fetchArticles = createAsyncThunk(
  'articles/fetchAll',
  async ({ page = 1, category = '' }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({ page: page.toString() });
      if (category) queryParams.append('category', category);
      
      const response = await fetch(`/api/articles?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch articles');
      return data.data; // { articles, pagination }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Send chat message to RAG service
 * @type {import('@reduxjs/toolkit').AsyncThunk<any, string, {}>}
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (query, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Chat request failed');
      return data.data; // { answer, sources }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ==========================================
// SLICES
// ==========================================

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearChat: (state) => {
      state.messages = [];
      state.error = null;
    },
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: action.payload.answer });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

const articlesSlice = createSlice({
  name: 'articles',
  initialState: {
    articles: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearArticlesError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchArticles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.articles = action.payload.articles;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    totalCost: 0,
    tokenUsage: 0,
    cacheHitRate: 0,
  },
  reducers: {
    updateAnalytics: (state, action) => {
      state.totalCost = action.payload.totalCost ?? state.totalCost;
      state.tokenUsage = action.payload.tokenUsage ?? state.tokenUsage;
      state.cacheHitRate = action.payload.cacheHitRate ?? state.cacheHitRate;
    }
  }
});

// ==========================================
// SELECTORS
// ==========================================

export const selectAuth = (state) => state.auth;
export const selectChat = (state) => state.chat;
export const selectArticles = (state) => state.articles;
export const selectAnalytics = (state) => state.analytics;

// ==========================================
// EXPORTS & STORE CONFIG
// ==========================================

export const { logout, clearAuthError } = authSlice.actions;
export const { clearChat, addUserMessage } = chatSlice.actions;
export const { clearArticlesError } = articlesSlice.actions;
export const { updateAnalytics } = analyticsSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    chat: chatSlice.reducer,
    articles: articlesSlice.reducer,
    analytics: analyticsSlice.reducer,
  },
});

export default store;
