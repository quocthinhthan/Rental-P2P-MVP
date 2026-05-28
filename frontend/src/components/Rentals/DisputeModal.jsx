// frontend/src/components/Rentals/DisputeModal.jsx
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import apiService from '../../services/api';
import './DisputeModal.css';

const DISPUTE_REASONS = [
  'Vật phẩm không đúng mô tả',
  'Vật phẩm hư hỏng trước khi nhận',
  'Chủ đồ không giao hàng đúng hẹn',
  'Người thuê trả hàng trễ/hỏng',
  'Hao mòn tài sản nghiêm trọng',
  'Mâu thuẫn về tiền cọc/ký quỹ',
  'Lý do khác'
];

function DisputeModal({ isOpen, rental, onClose, onSuccess }) {
  const [reasonCategory, setReasonCategory] = useState(DISPUTE_REASONS[0]);
  const [reasonDetails, setReasonDetails] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReasonCategory(DISPUTE_REASONS[0]);
      setReasonDetails('');
      setImageFiles([]);
      setPreviews([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const nextPreviews = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  if (!isOpen || !rental) return null;

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    if (imageFiles.length + selectedFiles.length > 3) {
      Swal.fire({
        title: 'Giới hạn hình ảnh',
        text: 'Bạn chỉ có thể đăng tối đa 3 ảnh bằng chứng.',
        icon: 'warning',
        confirmButtonColor: '#f97316'
      });
      return;
    }

    const validFiles = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: 'Định dạng không hợp lệ',
          text: `File "${file.name}" không đúng định dạng ảnh cho phép (.jpg, .jpeg, .png, .webp, .gif).`,
          icon: 'error',
          confirmButtonColor: '#f97316'
        });
        return;
      }

      if (file.size > maxSizeBytes) {
        Swal.fire({
          title: 'Kích thước quá lớn',
          text: `Ảnh "${file.name}" vượt quá dung lượng 5MB cho phép.`,
          icon: 'error',
          confirmButtonColor: '#f97316'
        });
        return;
      }

      validFiles.push(file);
    }

    setImageFiles((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (reasonDetails.trim().length < 10) {
      Swal.fire({
        title: 'Mô tả quá ngắn',
        text: 'Vui lòng nhập mô tả chi tiết sự cố tối thiểu 10 ký tự.',
        icon: 'warning',
        confirmButtonColor: '#f97316'
      });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload images to Cloudinary
      let uploadedUrls = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await apiService.uploadImages(imageFiles);
      }

      // 2. Format final reason text
      const finalReason = `[${reasonCategory}] ${reasonDetails.trim()}`;

      // 3. Create Dispute via API
      await apiService.createDispute(rental._id, finalReason, uploadedUrls);

      Swal.fire({
        title: 'Thành công! 🎉',
        text: 'Đã gửi báo cáo sự cố thành công. Hệ thống đang tiến hành hòa giải.',
        icon: 'success',
        confirmButtonColor: '#f97316'
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo sự cố.';
      Swal.fire({
        title: 'Gửi khiếu nại thất bại ⚠️',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop dispute-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal dispute-item-modal">
        {/* Header */}
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow text-danger">🛡️ Khiếu nại sự cố</p>
            <h3>Báo cáo tranh chấp đơn thuê</h3>
          </div>
          <button
            className="modal-close-btn"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="dispute-item-form-body">
          <p className="rental-modal-subtitle">
            Nếu có bất kỳ sự cố nào xảy ra trong quá trình bàn giao hoặc sử dụng tài sản, vui lòng mô tả chi tiết và cung cấp hình ảnh bằng chứng làm căn cứ xử lý cho ban quản trị.
          </p>

          {/* Chọn loại sự cố */}
          <div className="dispute-form-group">
            <label className="dispute-form-label">Loại sự cố phát sinh <sup>*</sup></label>
            <select
              className="form-select dispute-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={submitting}
            >
              {DISPUTE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Mô tả chi tiết */}
          <div className="dispute-form-group">
            <label className="dispute-form-label">
              Mô tả chi tiết sự cố <sup>*</sup>
            </label>
            <textarea
              className="form-control dispute-textarea"
              rows="4"
              placeholder="Vui lòng cung cấp thêm thông tin chi tiết về sự cố (ví dụ: mô tả hư hỏng, thiếu linh kiện bàn giao, trễ hạn bàn giao cụ thể...)"
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <div className="dispute-textarea-footer">
              <span className={`char-count ${reasonDetails.trim().length < 10 ? 'text-danger' : 'text-success'}`}>
                {reasonDetails.trim().length} / tối thiểu 10 ký tự
              </span>
            </div>
          </div>

          {/* Tải ảnh bằng chứng */}
          <div className="dispute-form-group">
            <label className="dispute-form-label">
              Hình ảnh bằng chứng <span className="text-muted font-normal">(Tối đa 3 ảnh, mỗi ảnh dưới 5MB)</span>
            </label>
            <label className={`dispute-upload-box ${imageFiles.length >= 3 ? 'disabled' : ''}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={submitting || imageFiles.length >= 3}
                style={{ display: 'none' }}
              />
              <i className="fas fa-camera upload-box-icon" />
              <span>Chọn ảnh minh chứng</span>
              <small>Định dạng hỗ trợ: JPG, PNG, WEBP, GIF</small>
            </label>

            {/* Preview ảnh */}
            {previews.length > 0 && (
              <div className="dispute-preview-grid mt-3">
                {previews.map((previewUrl, idx) => (
                  <div key={previewUrl} className="dispute-preview-item">
                    <img src={previewUrl} alt={`Dispute Preview ${idx + 1}`} />
                    <button
                      type="button"
                      className="dispute-remove-image-btn"
                      onClick={() => removeImage(idx)}
                      disabled={submitting}
                      title="Xóa ảnh"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="rental-modal-actions mt-4">
            <button
              className="btn-xs btn-ghost-xs"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              className="btn-xs btn-danger-xs"
              type="submit"
              disabled={submitting || reasonDetails.trim().length < 10}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="far fa-flag me-2" />
                  Gửi khiếu nại
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DisputeModal;
