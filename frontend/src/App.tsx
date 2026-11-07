import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/common/ToastContext';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { QueryStudio } from './pages/QueryStudio';
import { DatabaseExplorer } from './pages/DatabaseExplorer';
import { MemoryInspector } from './pages/MemoryInspector';
import { LearningHistory } from './pages/LearningHistory';
import { ComparisonView } from './pages/ComparisonView';
import { Settings } from './pages/Settings';
import { PageView } from './types';
import { motion, AnimatePresence } from 'framer-motion';

const VALID_PAGES: PageView[] = [
  'dashboard',
  'query-studio',
  'database-explorer',
  'memory-inspector',
  'learning-history',
  'comparison-view',
  'settings'
];

function getPageFromHash(): PageView {
  const hash = window.location.hash.replace(/^#\/?/, '') as PageView;
  return VALID_PAGES.includes(hash) ? hash : 'dashboard';
}

export function App() {
  const [currentPage, setCurrentPageState] = useState<PageView>(getPageFromHash);
  const [selectedStudioQuery, setSelectedStudioQuery] = useState<string>(
    'Calculate net revenue from premium customers.'
  );

  const setCurrentPage = (page: PageView) => {
    setCurrentPageState(page);
    window.location.hash = page;
  };

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPageState(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectQueryForStudio = (q: string) => {
    setSelectedStudioQuery(q);
    setCurrentPage('query-studio');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setCurrentPage}
            onSelectQueryForStudio={handleSelectQueryForStudio}
          />
        );
      case 'query-studio':
        return <QueryStudio initialQuery={selectedStudioQuery} />;
      case 'database-explorer':
        return <DatabaseExplorer />;
      case 'memory-inspector':
        return <MemoryInspector />;
      case 'learning-history':
        return <LearningHistory />;
      case 'comparison-view':
        return <ComparisonView />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            onNavigate={setCurrentPage}
            onSelectQueryForStudio={handleSelectQueryForStudio}
          />
        );
    }
  };

  return (
    <ToastProvider>
      <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </MainLayout>
    </ToastProvider>
  );
}

export default App;
