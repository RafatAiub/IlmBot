import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAnalytics } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

const Analytics = () => {
  const { totalCost, tokenUsage, cacheHitRate } = useSelector(selectAnalytics);
  const [loading, setLoading] = useState(true);
  const [topQuestions, setTopQuestions] = useState([]);

  // Mock fetching analytics data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // In a real app, this would be an API call to /api/analytics
        // await fetch('/api/analytics');
        
        // Simulating network delay and mock data
        setTimeout(() => {
          setTopQuestions([
            { id: 1, query: "What is the definition of Tawheed?", count: 145 },
            { id: 2, query: "How to perform Wudu correctly?", count: 89 },
            { id: 3, query: "Rulings on traveling during Ramadan", count: 76 },
            { id: 4, query: "Conditions of accepted Salah", count: 54 }
          ]);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading analytics dashboard..." size="lg" />
      </div>
    );
  }

  // Cost visualization logic using simple divs
  const maxCost = 50; // Arbitrary max for the bar chart scale
  const costPercentage = Math.min((totalCost / maxCost) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard & Analytics</h1>
        <p className="text-gray-500 mt-2">Monitor AI usage, costs, and user engagement</p>
      </header>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total API Cost</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">${totalCost.toFixed(4)}</span>
              <span className="text-sm text-gray-500">USD</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div 
                className={`h-2 rounded-full ${costPercentage > 80 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${costPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-right">Budget Limit: $50.00</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Token Usage</h3>
          <div className="mt-2">
            <span className="text-4xl font-extrabold text-blue-600">
              {tokenUsage.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-4 flex items-center gap-1">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            +12% from last week
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cache Hit Rate</h3>
          <div className="mt-2">
            <span className="text-4xl font-extrabold text-purple-600">
              {cacheHitRate}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Saves approximately ${(totalCost * (cacheHitRate/100)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Token Usage Chart (Div Based) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Weekly Token Usage</h2>
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            {/* Mock bars */}
            {[40, 70, 45, 90, 65, 80, 50].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-blue-100 hover:bg-blue-300 transition-colors rounded-t-sm relative" 
                  style={{ height: `${height}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {height * 100}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Day {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Questions List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Top User Queries</h2>
          <ul className="divide-y divide-gray-100">
            {topQuestions.map((q, index) => (
              <li key={q.id} className="py-3 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                    {q.query}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {q.count} times
                </span>
              </li>
            ))}
          </ul>
        </div>
        
      </div>
    </div>
  );
};

export default Analytics;
