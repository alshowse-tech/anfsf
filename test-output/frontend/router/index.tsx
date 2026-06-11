import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
