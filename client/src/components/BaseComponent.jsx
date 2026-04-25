import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// import { someAction } from '../store';

/**
 * BaseComponent Template
 * Demonstrates: Redux hooks, loading/error states, Tailwind structure, A11y, Error Boundaries
 */
const BaseComponent = () => {
  // 1. Redux Hooks
  const dispatch = useDispatch();
  // Example selector usage:
  // const { data, isLoading, error } = useSelector((state) => state.someSlice);

  // 2. Local State (if needed alongside Redux)
  const [localState, setLocalState] = useState(false);

  // 3. Side Effects
  useEffect(() => {
    // dispatch(someAction());
  }, [dispatch]);

  // 4. Loading State Pattern
  // if (isLoading) return <LoadingSpinner />;

  // 5. Error State Pattern
  // if (error) return <div role="alert" className="text-red-500">{error}</div>;

  return (
    // Tailwind Organization: Layout -> Spacing -> Typography -> Visuals -> Interaction
    <section 
      className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md"
      aria-labelledby="base-component-title"
    >
      <header>
        {/* A11y: Proper heading hierarchy */}
        <h2 id="base-component-title" className="text-2xl font-bold text-gray-800">
          Component Title
        </h2>
      </header>
      
      <div className="mt-4 text-gray-600">
        <p>Main content goes here.</p>
        
        {/* A11y: Interactive elements should have accessible names/roles */}
        <button 
          onClick={() => setLocalState(!localState)}
          className="px-4 py-2 mt-4 text-white bg-blue-600 rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
          aria-pressed={localState}
        >
          Toggle Action
        </button>
      </div>
    </section>
  );
};

// Error Boundary wrapper (usually implemented as a generic HOC, but shown here for pattern)
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
          Something went wrong loading this component.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BaseComponentWithErrorBoundary(props) {
  return (
    <ErrorBoundary>
      <BaseComponent {...props} />
    </ErrorBoundary>
  );
}
