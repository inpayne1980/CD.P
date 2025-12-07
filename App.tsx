import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LivePage from './pages/LivePage';
import VeoPage from './pages/VeoPage';
import ImageStudio from './pages/ImageStudio';
import AssistantPage from './pages/AssistantPage';
import { RoutePath } from './types';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path={RoutePath.HOME} element={<Dashboard />} />
          <Route path={RoutePath.LIVE} element={<LivePage />} />
          <Route path={RoutePath.VIDEO} element={<VeoPage />} />
          <Route path={RoutePath.IMAGE} element={<ImageStudio />} />
          <Route path={RoutePath.ASSISTANT} element={<AssistantPage />} />
          <Route path="*" element={<Navigate to={RoutePath.HOME} replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
