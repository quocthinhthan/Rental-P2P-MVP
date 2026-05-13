import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiService from '../services/api';
import '../styles/Auth.css';

function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await apiService.forgotPassword(data.email);
      setSuccessMessage(response.data?.message || 'Vui lòng kiểm tra email để đặt lại mật khẩu.');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-form-col">
        <div className="auth-bg-shape shape-1"></div>
        <div className="auth-bg-shape shape-2"></div>
        <div className="auth-bg-shape shape-3"></div>

        <div className="auth-form-container">
          <Link to="/" className="auth-logo">
            <i className="fas fa-box-open"></i> RentEase
          </Link>

          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập email tài khoản của bạn. Hệ thống sẽ gửi liên kết đặt lại mật khẩu nếu email hợp lệ.
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {apiError && (
              <div className="alert alert-danger" style={{ borderRadius: '12px' }} role="alert">
                <i className="fas fa-exclamation-circle me-2"></i>{apiError}
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success" style={{ borderRadius: '12px' }} role="alert">
                <i className="fas fa-check-circle me-2"></i>{successMessage}
              </div>
            )}

            <div className="auth-input-group">
              <input
                type="email"
                className={`auth-input ${errors.email ? 'is-invalid' : ''}`}
                placeholder="Địa chỉ Email"
                {...register('email', {
                  required: 'Email là bắt buộc',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Định dạng email không hợp lệ'
                  }
                })}
              />
              <i className="fas fa-envelope"></i>
              {errors.email && <div className="auth-invalid-feedback">{errors.email.message}</div>}
            </div>

            <button type="submit" className="auth-btn-submit" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Đang gửi...</>
              ) : (
                'Gửi yêu cầu'
              )}
            </button>

            <p className="text-center mt-4 text-muted">
              Nhớ mật khẩu rồi? <Link to="/login" className="auth-link">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>

      <div className="auth-image-col">
        <img
          src="/img/loginbanner.webp"
          alt="Rental items"
          className="auth-image-bg"
        />
        <div className="auth-image-overlay">
          <h2>Lấy lại quyền truy cập.</h2>
          <p>Chúng tôi sẽ gửi đường dẫn an toàn đến email để bạn đặt lại mật khẩu trong vài phút.</p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
