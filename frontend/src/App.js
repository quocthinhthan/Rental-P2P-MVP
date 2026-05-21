import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css'; 

// Import components
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import GlobalSpinner from './components/Common/GlobalSpinner';
import LocationPickerHost from './components/Common/LocationPickerHost';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ItemDetailPage from './pages/ItemDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccountPage from './pages/AccountPage';
import MyRentalsPage from './pages/MyRentalsPage';
import RentalDetailPage from './pages/RentalDetailPage';
import PostItemPage from './pages/PostItemPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import VNPayReturnPage from './pages/VNPayReturnPage';
import PublicUserProfilePage from './pages/PublicUserProfilePage';
import ProtectedRoute from './components/Auth/ProtectedRoute'; // <-- 1. IMPORT
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminDisputeDetailPage from './pages/AdminDisputeDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminItemsPage from './pages/AdminItemsPage';
import AdminItemDetailPage from './pages/AdminItemDetailPage';
import AdminItemReportsPage from './pages/AdminItemReportsPage';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <>
      <GlobalSpinner />
      <LocationPickerHost />
      <ScrollToTop />
      <Header />
      <Routes>
        {/* Routes công khai */}
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/items/:itemId" element={<ItemDetailPage />} />
        <Route path="/users/:userId/profile" element={<PublicUserProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/vnpay-return" element={<VNPayReturnPage />} />
        <Route path="*" element={<NotFoundPage />} />

        {/* 2. Cấu hình Routes cần bảo vệ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/my-rentals" element={<MyRentalsPage />} />
          <Route path="/my-rentals/:rentalId" element={<RentalDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/post-item" element={<PostItemPage />} />
          <Route path="/edit-item/:itemId" element={<PostItemPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/items" element={<AdminItemsPage />} />
          <Route path="/admin/items/:id" element={<AdminItemDetailPage />} />
          <Route path="/admin/item-reports" element={<AdminItemReportsPage />} />
          <Route path="/admin/disputes" element={<AdminDisputesPage />} />
          <Route path="/admin/disputes/:disputeId" element={<AdminDisputeDetailPage />} />
          {/* Thêm bất kỳ route nào cần login vào đây */}
        </Route>
      </Routes>
      <Footer />

      {/* Back to Top button (từ template) */}
      <button
        type="button"
        className="btn btn-primary btn-lg-square back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <i className="fa fa-arrow-up"></i>
      </button>
    </>
  );
}

export default App;
