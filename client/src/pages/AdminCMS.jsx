import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectArticles, fetchArticles } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminCMS = () => {
  const dispatch = useDispatch();
  const { articles, total, page, isLoading, error } = useSelector(selectArticles);
  
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchArticles({ page: 1 }));
  }, [dispatch]);

  const handleEdit = (article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const handleAiImprove = async (id, action) => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/articles/${id}/ai-improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Simple auth getter
        },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'AI processing failed');
      
      alert(`AI Improved text generated using ${data.data.tokensUsed} tokens.`);
      // In a real app, populate the form with data.data.improved
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article forever?')) return;
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      dispatch(fetchArticles({ page })); // Refresh current page
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base CMS</h1>
          <p className="text-gray-500 mt-1">Manage articles and run AI improvements</p>
        </div>
        <button 
          onClick={() => { setSelectedArticle(null); setIsModalOpen(true); }}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none"
        >
          + Create Article
        </button>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && !articles.length ? (
          <div className="p-12"><LoadingSpinner text="Loading articles..." /></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Tools</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{article.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{article.content?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button 
                      onClick={() => handleAiImprove(article._id, 'summarize')}
                      disabled={aiLoading}
                      className="text-purple-600 hover:text-purple-900 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Summarize
                    </button>
                    <button 
                      onClick={() => handleAiImprove(article._id, 'improve')}
                      disabled={aiLoading}
                      className="text-indigo-600 hover:text-indigo-900 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Improve
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => handleEdit(article)} className="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onClick={() => handleDelete(article._id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">No articles found. Create one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination (Simplified) */}
      <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
        <span>Showing page {page}</span>
        <div className="space-x-2">
          <button 
            disabled={page === 1} 
            onClick={() => dispatch(fetchArticles({ page: page - 1 }))}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            disabled={articles.length < 10} // Assuming limit 10
            onClick={() => dispatch(fetchArticles({ page: page + 1 }))}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCMS;
