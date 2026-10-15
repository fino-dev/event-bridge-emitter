import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const HomePage = React.lazy(() => import('../../pages/HomePage'));

function App(_props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.Home} element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
