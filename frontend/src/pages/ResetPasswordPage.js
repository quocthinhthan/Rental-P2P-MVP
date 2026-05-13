import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import apiService from '../services/api';
import '../styles/Auth.css';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const newPassword = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      setApiError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const response = await apiService.resetPassword(token, data.password);

      await Swal.fire({
        title: 'Đổi mật khẩu thành công!',
        text: response.data?.message || 'Vui lòng đăng nhập lại bằng mật khẩu mới.',
        icon: 'success',
        confirmButtonColor: '#1a6b4a',
        confirmButtonText: 'Đăng nhập'
      });

      navigate('/login');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
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

          <h1 className="auth-title">Đặt lại mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {apiError && (
              <div className="alert alert-danger" style={{ borderRadius: '12px' }} role="alert">
                <i className="fas fa-exclamation-circle me-2"></i>{apiError}
              </div>
            )}

            <div className="auth-input-group">
              <input
                type="password"
                className={`auth-input ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Mật khẩu mới"
                {...register('password', {
                  required: 'Vui lòng nhập mật khẩu mới',
                  minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                })}
              />
              <i className="fas fa-lock"></i>
              {errors.password && <div className="auth-invalid-feedback">{errors.password.message}</div>}
            </div>

            <div className="auth-input-group">
              <input
                type="password"
                className={`auth-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                placeholder="Xác nhận mật khẩu"
                {...register('confirmPassword', {
                  required: 'Vui lòng xác nhận mật khẩu',
                  validate: (value) => value === newPassword || 'Mật khẩu xác nhận không khớp'
                })}
              />
              <i className="fas fa-lock"></i>
              {errors.confirmPassword && <div className="auth-invalid-feedback">{errors.confirmPassword.message}</div>}
            </div>

            <button type="submit" className="auth-btn-submit" disabled={loading || !token}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Đang cập nhật...</>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>

            <p className="text-center mt-4 text-muted">
              Quay lại <Link to="/login" className="auth-link">đăng nhập</Link>
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
          <h2>Bảo vệ tài khoản.</h2>
          <p>Chọn mật khẩu mới đủ mạnh, sau đó đăng nhập lại để tiếp tục sử dụng RentEase.</p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
