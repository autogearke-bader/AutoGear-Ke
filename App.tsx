
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage.tsx';
import CarAccessoriesPage from './pages/CarAccessoriesPage.tsx';
import GadgetsPage from './pages/GadgetsPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import ProductDetailPage from './pages/ProductDetailPage.tsx';
import BlogPage from './pages/BlogPage.tsx';
import ArticleDetailPage from './pages/ArticleDetailPage.tsx';
import Layout from './components/Layout.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/car-accessories/" element={<CarAccessoriesPage />} />
              <Route path="/mobile-accessories/" element={<GadgetsPage />} />
              <Route path="/car-accessories/:slug" element={<ProductDetailPage />} />
              <Route path="/mobile-accessories/:slug" element={<ProductDetailPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/admin-portal" element={<AdminPage />} />
              <Route path="/blogs" element={<BlogPage />} />
              <Route path="/blogs/:slug" element={<ArticleDetailPage />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
