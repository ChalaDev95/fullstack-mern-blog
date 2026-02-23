import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';



// Public routes
import Home from './pages/public/Home';
import PostDetail from './pages/public/PostDetail';
import PostsList from './pages/public/PostsList';
import PageDetail from './pages/public/PageDetail';
import Search from './pages/public/Search';

// Admin routes
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPosts from './pages/admin/Posts';
import AdminPostEdit from './pages/admin/PostEdit';
import AdminPages from './pages/admin/Pages';
import AdminComments from './pages/admin/Comments';
import AdminMedia from './pages/admin/Media';
import AdminUsers from './pages/admin/Users';
import AdminCategories from './pages/admin/Categories';
import AdminTags from './pages/admin/Tags';
import AdminSettings from './pages/admin/Settings';
import Login from './pages/admin/Login';

// Protected route component
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <Router>
            <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/posts" element={<PostsList />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
          <Route path="/pages/:slug" element={<PageDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/categories/:slug" element={<PostsList />} />
          <Route path="/tags/:slug" element={<PostsList />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="posts/new" element={<AdminPostEdit />} />
            <Route path="posts/edit/:id" element={<AdminPostEdit />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="comments" element={<AdminComments />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="tags" element={<AdminTags />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;


