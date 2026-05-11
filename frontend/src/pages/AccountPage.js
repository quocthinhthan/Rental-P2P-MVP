import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import '../styles/AccountPage.css';

function AccountPage() {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm();

  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState('');

  const [ekycUrl, setEkycUrl] = useState('');
  const [ekycLoading, setEkycLoading] = useState(false);
  const [ekycError, setEkycError] = useState('');
  const [ekycData, setEkycData] = useState(null);

  // Controls whether to show eKYC form (hidden when already verified)
  const [ekycFormOpen, setEkycFormOpen] = useState(false);

  const isVerified = user?.ekycStatus === 'verified';

  useEffect(() => {
    if (!user) return;
    setValue('fullName', user.fullName || '');
    setValue('email', user.email || '');
    setValue('phoneNumber', user.phoneNumber || '');
    setValue('address', user.address || '');
    setValue('avatarUrl', user.avatarUrl || '');
    // If not verified, open eKYC form by default
    if (!isVerified) setEkycFormOpen(true);
  }, [user, setValue, isVerified]);

  const uploadImageFile = async (file) => {
    const response = await apiService.uploadImage(file);
    return {
      imageUrl: response.data?.imageUrl,
      publicId: response.data?.publicId
    };
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleIdCardChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIdCardFile(file);
    setIdCardPreview(URL.createObjectURL(file));
    setEkycData(null);
    setEkycError('');
  };

  const handleVerifyEkyc = async () => {
    let uploadedPublicId = '';
    setEkycLoading(true);
    setEkycError('');
    setEkycData(null);

    try {
      let imageUrl = ekycUrl.trim();
      if (idCardFile) {
        const uploaded = await uploadImageFile(idCardFile);
        imageUrl = uploaded.imageUrl;
        uploadedPublicId = uploaded.publicId || '';
        if (imageUrl) setEkycUrl(imageUrl);
      }

      if (!imageUrl) {
        setEkycError('Vui lòng tải ảnh CCCD hoặc nhập URL ảnh.');
        setEkycLoading(false);
        return;
      }

      const response = await apiService.verifyEKYC(imageUrl);
      const extracted = response.data?.extractedData;
      if (!extracted?.idNumber) {
        throw new Error('Không đọc được thông tin từ ảnh CCCD.');
      }

      setEkycData(extracted);
      if (extracted.fullName) setValue('fullName', extracted.fullName);
      if (extracted.address) setValue('address', extracted.address);
      
      await Swal.fire({
        title: 'Xác thực thành công! 🎉',
        html: `Thông tin CCCD của <b>${extracted.fullName || ''}</b> đã được đọc thành công.<br/><br/>Nhấn <b>"Lưu thay đổi"</b> bên dưới để hoàn tất xác thực.`,
        icon: 'success',
        confirmButtonText: 'Đã hiểu, tiếp tục'
      });
    } catch (error) {
      if (uploadedPublicId) {
        try {
          await apiService.deleteImage(uploadedPublicId);
        } catch (cleanupError) {
          console.warn('Cleanup CCCD image failed:', cleanupError);
        }
      }
      setEkycError(error.response?.data?.message || 'Xác thực eKYC thất bại.');
    } finally {
      setEkycLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);

    try {
      let avatarUrl = data.avatarUrl;
      if (avatarFile) {
        const uploadedAvatar = await uploadImageFile(avatarFile);
        if (uploadedAvatar.imageUrl) avatarUrl = uploadedAvatar.imageUrl;
      }

      let idCardImageUrl = ekycUrl.trim();
      if (!idCardImageUrl && idCardFile) {
        const uploadedIdCard = await uploadImageFile(idCardFile);
        if (uploadedIdCard.imageUrl) {
          idCardImageUrl = uploadedIdCard.imageUrl;
          setEkycUrl(uploadedIdCard.imageUrl);
        }
      }

      const payload = {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        avatarUrl
      };

      if (ekycData?.idNumber) {
        payload.idCardNumber = ekycData.idNumber;
        if (idCardImageUrl) payload.idCardImages = [idCardImageUrl];
      }

      const response = await apiService.updateProfile(payload);
      updateUser(response.data);
      Swal.fire('Thành công!', 'Cập nhật thông tin thành công!', 'success');
    } catch (error) {
      Swal.fire('Thất bại', error.response?.data?.message || 'Không thể cập nhật thông tin.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Page Header ── */}
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          Tài khoản của tôi
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item active text-white">Tài khoản</li>
        </ol>
      </div>

      {/* ── Main Content ── */}
      <div className="acc-page-bg">
        <div className="container">
          <div className="row g-4 align-items-start">

            {/* ── LEFT: Profile Sidebar ── */}
            <div className="col-lg-4">
              <div className="acc-profile-card">
                <div className="acc-avatar-wrap">
                  {(avatarPreview || user?.avatarUrl) ? (
                    <img
                      src={avatarPreview || user?.avatarUrl}
                      alt={user?.fullName}
                      className="acc-avatar"
                    />
                  ) : (
                    <div className="acc-avatar-placeholder">
                      <i className="fa fa-user" />
                    </div>
                  )}
                  {isVerified && (
                    <div className="acc-verified-badge" title="Đã xác thực eKYC">
                      <i className="fas fa-check" />
                    </div>
                  )}
                </div>

                <div className="acc-user-name">{user?.fullName || 'Người dùng'}</div>
                <div className="acc-user-email mb-3">{user?.email}</div>

                <div className="d-flex justify-content-center mb-3">
                  <span className={`acc-status-badge ${isVerified ? 'verified' : 'unverified'}`}>
                    <i className={`fas ${isVerified ? 'fa-shield-alt' : 'fa-clock'}`} />
                    {isVerified ? 'Đã xác thực eKYC' : 'Chưa xác thực'}
                  </span>
                </div>

                {user?.phoneNumber && (
                  <div className="text-center text-muted" style={{ fontSize: '.85rem' }}>
                    <i className="fas fa-phone-alt text-success me-1" />{user.phoneNumber}
                  </div>
                )}

                {user?.address && (
                  <div className="text-center text-muted mt-1" style={{ fontSize: '.85rem' }}>
                    <i className="fas fa-map-marker-alt text-danger me-1" />{user.address}
                  </div>
                )}

                <div className="acc-sidebar-info mt-3">
                  <div><i className="fas fa-info-circle" />Cập nhật thông tin để tăng uy tín khi thuê/cho thuê trên nền tảng.</div>
                  {!isVerified && (
                    <div className="mt-2">
                      <i className="fas fa-exclamation-triangle text-warning" />
                      <span className="text-warning fw-medium">Xác thực eKYC để mở đầy đủ tính năng.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Form ── */}
            <div className="col-lg-8">
              <div className="acc-form-card">
                <form onSubmit={handleSubmit(onSubmit)}>

                  {/* ── Section: Thông tin cơ bản ── */}
                  <div className="acc-section-title">
                    <i className="fas fa-user-edit" />Thông tin cá nhân
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Họ và tên <sup className="text-danger">*</sup></label>
                      <input
                        type="text"
                        className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                        placeholder="Nguyễn Văn A"
                        {...register('fullName', { required: 'Vui lòng nhập họ và tên' })}
                      />
                      {errors.fullName && <div className="invalid-feedback">{errors.fullName.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        readOnly
                        {...register('email')}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Số điện thoại <sup className="text-danger">*</sup></label>
                      <input
                        type="tel"
                        className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                        placeholder="09xxxxxxxx"
                        {...register('phoneNumber', {
                          required: 'Vui lòng nhập số điện thoại',
                          pattern: {
                            value: /^0\d{9,10}$/,
                            message: 'Số điện thoại không hợp lệ'
                          }
                        })}
                      />
                      {errors.phoneNumber && <div className="invalid-feedback">{errors.phoneNumber.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Địa chỉ</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Quận, Thành phố..."
                        {...register('address')}
                      />
                    </div>
                  </div>

                  {/* ── Section: Avatar ── */}
                  <div className="acc-section-title mt-4">
                    <i className="fas fa-camera" />Ảnh đại diện
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Tải ảnh lên</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleAvatarChange}
                      />
                      {(avatarPreview || user?.avatarUrl) && (
                        <img
                          src={avatarPreview || user?.avatarUrl}
                          alt="avatar-preview"
                          className="acc-avatar-preview"
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Hoặc dán URL ảnh</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://..."
                        {...register('avatarUrl')}
                      />
                    </div>
                  </div>

                  {/* ── Divider ── */}
                  <hr className="acc-divider" />

                  {/* ── Section: eKYC ── */}
                  <div className="acc-section-title">
                    <i className="fas fa-id-card" />Xác thực danh tính (eKYC)
                  </div>

                  <div className="acc-ekyc-section">
                    {/* If verified, show banner + toggle button */}
                    {isVerified && !ekycFormOpen ? (
                      <div className="acc-ekyc-verified-banner">
                        <div className="acc-ekyc-verified-icon">
                          <i className="fas fa-shield-alt" />
                        </div>
                        <div>
                          <div className="acc-ekyc-verified-title">Danh tính đã được xác thực</div>
                          <div className="acc-ekyc-verified-sub">Tài khoản của bạn đã được xác minh qua CCCD</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm acc-ekyc-edit-btn"
                          onClick={() => setEkycFormOpen(true)}
                        >
                          <i className="fas fa-redo-alt me-1" />Xác thực lại
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Collapse close btn when verified and form is open */}
                        {isVerified && ekycFormOpen && (
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-muted small">
                              <i className="fas fa-info-circle me-1 text-primary" />
                              Xác thực lại sẽ ghi đè thông tin CCCD cũ.
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => { setEkycFormOpen(false); setEkycData(null); setEkycError(''); }}
                            >
                              <i className="fas fa-times me-1" />Hủy
                            </button>
                          </div>
                        )}

                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label">
                              Ảnh CCCD mặt trước <sup className="text-danger">*</sup>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control"
                              onChange={handleIdCardChange}
                            />
                            {(idCardPreview || ekycUrl) && (
                              <img
                                src={idCardPreview || ekycUrl}
                                alt="cccd-preview"
                                className="acc-idcard-preview"
                              />
                            )}
                          </div>
                          <div className="col-12">
                            <label className="form-label">Hoặc dán URL ảnh CCCD</label>
                            <input
                              type="url"
                              className="form-control"
                              placeholder="https://..."
                              value={ekycUrl}
                              onChange={(e) => setEkycUrl(e.target.value)}
                            />
                          </div>
                          <div className="col-12">
                            <button
                              type="button"
                              className="acc-verify-btn"
                              onClick={handleVerifyEkyc}
                              disabled={ekycLoading}
                            >
                              {ekycLoading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Đang xác thực...</>
                              ) : (
                                <><i className="fas fa-fingerprint me-2" />Xác thực eKYC ngay</>
                              )}
                            </button>
                          </div>
                        </div>

                        {ekycError && (
                          <div className="acc-alert-danger mt-3">
                            <i className="fas fa-times-circle" /> {ekycError}
                          </div>
                        )}

                        {ekycData && (
                          <div className="acc-ekyc-data-card mt-3">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <i className="fas fa-check-circle text-success" />
                              <span className="fw-bold text-success" style={{ fontSize: '.85rem' }}>Đã đọc thông tin thành công</span>
                            </div>
                            <div className="acc-ekyc-data-row"><span className="acc-ekyc-data-label">Họ tên:</span>{ekycData.fullName || '---'}</div>
                            <div className="acc-ekyc-data-row"><span className="acc-ekyc-data-label">Số CCCD:</span>{ekycData.idNumber || '---'}</div>
                            <div className="acc-ekyc-data-row"><span className="acc-ekyc-data-label">Ngày sinh:</span>{ekycData.dob || '---'}</div>
                            <div className="acc-ekyc-data-row"><span className="acc-ekyc-data-label">Địa chỉ:</span>{ekycData.address || '---'}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Submit ── */}
                  <div className="mt-4 d-flex justify-content-end gap-3 align-items-center">
                    {saving && (
                      <span className="text-muted small">
                        <span className="spinner-border spinner-border-sm me-1" />Đang lưu...
                      </span>
                    )}
                    <button type="submit" className="acc-submit-btn" disabled={saving}>
                      <i className="fas fa-save me-2" />
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
            {/* /col right */}

          </div>
        </div>
      </div>
    </>
  );
}

export default AccountPage;
