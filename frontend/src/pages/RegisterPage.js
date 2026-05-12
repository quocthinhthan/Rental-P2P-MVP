import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiService from '../services/api';
import Swal from 'sweetalert2';
import '../styles/Auth.css' // Import file CSS

function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    try {
      await apiService.register(data.fullName, data.email, data.password, data.phoneNumber);

      await Swal.fire({
        title: 'Đăng ký thành công! 🎉',
        text: 'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để bắt đầu.',
        icon: 'success',
        confirmButtonColor: '#1a6b4a',
        confirmButtonText: 'Đăng nhập ngay'
      });
      
      navigate('/login');

    } catch (error) {
      if (error.response && error.response.status === 400) {
        setApiError(error.response.data.message || 'Email hoặc số điện thoại đã được sử dụng.');
      } else {
        setApiError('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Cột Hình ảnh (Bên trái cho trang Đăng Ký để đổi gió) */}
      <div className="auth-image-col">
        <img 
          src="/img/registerbanner.jpg" 
          alt="Tool Equipment" 
          className="auth-image-bg" 
        />
        <div className="auth-image-overlay">
          <h2>Chia sẻ đồ dùng. <br/>Kiếm thêm thu nhập.</h2>
          <p>Tham gia cộng đồng của chúng tôi để thuê những món đồ bạn cần hoặc cho thuê những gì bạn có.</p>
        </div>
      </div>

      {/* Cột Form Đăng Ký */}
      <div className="auth-form-col">
        <div className="auth-bg-shape shape-1"></div>
        <div className="auth-bg-shape shape-2"></div>
        <div className="auth-bg-shape shape-3"></div>
        <div className="auth-form-container">
          <Link to="/" className="auth-logo d-lg-none">
            <i className="fas fa-box-open"></i> RentEase
          </Link>
          
          <h1 className="auth-title">Tạo tài khoản mới</h1>
          <p className="auth-subtitle">Đăng ký nhanh chóng chỉ trong 1 phút để bắt đầu thuê đồ.</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {apiError && (
              <div className="alert alert-danger" style={{ borderRadius: '12px' }} role="alert">
                <i className="fas fa-exclamation-circle me-2"></i>{apiError}
              </div>
            )}

            <div className="auth-input-group">
              <input 
                type="text" 
                className={`auth-input ${errors.fullName ? 'is-invalid' : ''}`}
                placeholder="Họ và tên của bạn"
                {...register('fullName', { required: 'Vui lòng nhập họ và tên' })}
              />
              <i className="fas fa-user"></i>
              {errors.fullName && <div className="auth-invalid-feedback">{errors.fullName.message}</div>}
            </div>

            <div className="auth-input-group">
              <input 
                type="email" 
                className={`auth-input ${errors.email ? 'is-invalid' : ''}`}
                placeholder="Địa chỉ Email"
                {...register('email', { required: 'Vui lòng nhập email' })}
              />
              <i className="fas fa-envelope"></i>
              {errors.email && <div className="auth-invalid-feedback">{errors.email.message}</div>}
            </div>

            <div className="auth-input-group">
              <input
                type="tel"
                className={`auth-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                placeholder="Số điện thoại di động"
                {...register('phoneNumber', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^0\d{9,10}$/,
                    message: 'Số điện thoại không hợp lệ (Bắt đầu bằng 0, gồm 10-11 số)'
                  }
                })}
              />
              <i className="fas fa-phone-alt"></i>
              {errors.phoneNumber && <div className="auth-invalid-feedback">{errors.phoneNumber.message}</div>}
            </div>

            <div className="auth-input-group mb-4">
              <input 
                type="password" 
                className={`auth-input ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Mật khẩu (từ 6 ký tự)"
                {...register('password', { 
                  required: 'Vui lòng nhập mật khẩu', 
                  minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' } 
                })}
              />
              <i className="fas fa-lock"></i>
              {errors.password && <div className="auth-invalid-feedback">{errors.password.message}</div>}
            </div>

            <button type="submit" className="auth-btn-submit" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</>
              ) : (
                'Đăng Ký Tài Khoản'
              )}
            </button>

            <p className="text-center mt-4 text-muted">
              Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập tại đây</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;