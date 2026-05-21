import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import apiService from '../../services/api';
import './ReportItemModal.css';

const REPORT_REASONS = [
  'Sản phẩm nguy hiểm / Độc hại',
  'Hình ảnh nhạy cảm / Đồi trụy',
  'Lừa đảo / Giả mạo',
  'Hàng cấm / Trái pháp luật',
  'Mô tả sai lệch / Chất lượng kém',
  'Lý do khác'
];

function ReportItemModal({ isOpen, itemId, onClose, onSuccess }) {
  const [reasonCategory, setReasonCategory] = useState(REPORT_REASONS[0]);
  const [reasonDetails, setReasonDetails] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReasonCategory(REPORT_REASONS[0]);
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

  if (!isOpen || !itemId) return null;

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    if (imageFiles.length + selectedFiles.length > 3) {
      Swal.fire({
        title: 'Giới hạn hình ảnh',
        text: 'Bạn chỉ có thể đăng tối đa 3 ảnh minh chứng.',
        icon: 'warning',
        confirmButtonColor: '#ffb524'
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
          confirmButtonColor: '#ffb524'
        });
        return;
      }

      if (file.size > maxSizeBytes) {
        Swal.fire({
          title: 'Kích thước quá lớn',
          text: `Ảnh "${file.name}" vượt quá dung lượng 5MB cho phép.`,
          icon: 'error',
          confirmButtonColor: '#ffb524'
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
        text: 'Vui lòng nhập mô tả chi tiết lý do tối thiểu 10 ký tự.',
        icon: 'warning',
        confirmButtonColor: '#ffb524'
      });
      return;
    }

    try {
      setSubmitting(true);

      // 1. Tải ảnh lên Cloudinary nếu có
      let uploadedUrls = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await apiService.uploadImages(imageFiles);
      }

      // 2. Định dạng lý do gửi lên hệ thống
      const finalReason = `[${reasonCategory}] ${reasonDetails.trim()}`;

      // 3. Gọi API gửi báo cáo sản phẩm
      const response = await apiService.reportItem(itemId, {
        reason: finalReason,
        evidenceImages: uploadedUrls
      });

      Swal.fire({
        title: 'Thành công! 🎉',
        text: response.data.message || 'Đã gửi báo cáo sản phẩm thành công. Quản trị viên sẽ rà soát nội dung này.',
        icon: 'success',
        confirmButtonColor: '#ffb524'
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo sản phẩm.';
      Swal.fire({
        title: 'Gửi báo cáo thất bại ⚠️',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal report-item-modal">
        {/* Header */}
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow text-danger">🛡️ Báo cáo vi phạm</p>
            <h3>Báo cáo sản phẩm</h3>
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
        <form onSubmit={handleSubmit} className="report-item-form-body">
          <p className="rental-modal-subtitle">
            Giúp chúng tôi giữ môi trường lành mạnh bằng cách báo cáo các sản phẩm độc hại, nhạy cảm, lừa đảo hoặc vi phạm điều khoản dịch vụ.
          </p>

          {/* Chọn loại vi phạm */}
          <div className="report-form-group">
            <label className="report-form-label">Loại vi phạm <sup>*</sup></label>
            <select
              className="form-select report-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={submitting}
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Mô tả lý do chi tiết */}
          <div className="report-form-group">
            <label className="report-form-label">
              Mô tả chi tiết <sup>*</sup>
            </label>
            <textarea
              className="form-control report-textarea"
              rows="4"
              placeholder="Vui lòng cung cấp thêm chi tiết về vi phạm (ví dụ: mô tả hành vi đe dọa, hình ảnh cụ thể nào nhạy cảm, nghi ngờ lừa đảo ở điểm nào...)"
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <div className="report-textarea-footer">
              <span className={`char-count ${reasonDetails.trim().length < 10 ? 'text-danger' : 'text-success'}`}>
                {reasonDetails.trim().length} / tối thiểu 10 ký tự
              </span>
            </div>
          </div>

          {/* Tải lên ảnh minh chứng */}
          <div className="report-form-group">
            <label className="report-form-label">
              Ảnh minh chứng <span className="text-muted font-normal">(Tối đa 3 ảnh, mỗi ảnh dưới 5MB)</span>
            </label>
            <label className={`report-upload-box ${imageFiles.length >= 3 ? 'disabled' : ''}`}>
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
              <div className="report-preview-grid mt-3">
                {previews.map((previewUrl, idx) => (
                  <div key={previewUrl} className="report-preview-item">
                    <img src={previewUrl} alt={`Evidence Preview ${idx + 1}`} />
                    <button
                      type="button"
                      className="report-remove-image-btn"
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
                  Gửi báo cáo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportItemModal;
