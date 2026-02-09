import React from 'react';

import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoadingProvider } from './hooks/LoadingProvider';
import { ThemeProvider } from './hooks/useTheme.tsx';

import { routes } from './router/routes';
import { store } from './store';

import './index.css';

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <LoadingProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </LoadingProvider>
    </Provider>
  </React.StrictMode>,
);
