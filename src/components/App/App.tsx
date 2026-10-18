import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const HomePage = React.lazy(() => import('../../pages/HomePage'));
const TemplatePage = React.lazy(() => import('../../pages/TemplatePage'));

function App(_props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.Home} element={<HomePage />} />
      <Route path={ROUTES.Template} element={<TemplatePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
