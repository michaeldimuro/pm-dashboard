/**
 * Operations Page — Router wrapper for operations routes
 * /operations       → OperationsOverview
 * /operations/:id   → AgentDetailPage
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OperationsOverview } from './OperationsOverview';
import { AgentDetailPage } from './AgentDetailPage';

export const OperationsPage: React.FC = () => {
  return (
    <Routes>
      <Route index element={<OperationsOverview />} />
      <Route path=":agentId" element={<AgentDetailPage />} />
    </Routes>
  );
};

export default OperationsPage;
