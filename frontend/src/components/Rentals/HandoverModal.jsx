import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import apiService from '../../services/api';

const modalCopy = {
  pickup: {
    eyebrow: 'Ảnh bàn giao',
    title: 'Xác nhận giao đồ',
    subtitle: 'Tải lên ít nhất 1 ảnh tình trạng món đồ tại thời điểm bàn giao.',
    button: 'Xác nhận giao đồ',
    success: 'Đã xác nhận giao đồ. Đơn thuê chuyển sang trạng thái đang thuê.',
    missing: 'Vui lòng tải lên ít nhất 1 ảnh bàn giao trước khi xác nhận.',
  },
  return: {
    eyebrow: 'Ảnh trả đồ',
    title: 'Hoàn tất đơn / Trả đồ',
    subtitle: 'Tải lên ít nhất 1 ảnh tình trạng món đồ tại thời điểm nhận lại.',
    button: 'Hoàn tất đơn',
    success: 'Đơn thuê đã hoàn tất thành công.',
    missing: 'Vui lòng tải lên ít nhất 1 ảnh trả đồ trước khi xác nhận.',
  },
};

function HandoverModal({ isOpen, rental, type = 'pickup', onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const copy = modalCopy[type] || modalCopy.pickup;

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setPreviews([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [files]);

  if (!isOpen || !rental) return null;

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      Swal.fire('Thiếu ảnh xác nhận', copy.missing, 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const imageUrls = await apiService.uploadImages(files);

      if (type === 'return') {
        await apiService.completeRental(rental._id, imageUrls);
      } else {
        await apiService.pickupRental(rental._id, imageUrls);
      }

      Swal.fire('Thành công!', copy.success, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      Swal.fire(
        'Lỗi!',
        err.response?.data?.message || 'Không thể cập nhật ảnh xác nhận. Vui lòng thử lại.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal handover-modal">
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow">{copy.eyebrow}</p>
            <h3>{copy.title}</h3>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            ×
          </button>
        </div>

        <p className="rental-modal-subtitle">{copy.subtitle}</p>

        <label className="handover-upload-box">
          <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={submitting} />
          <span>Chọn ảnh từ thiết bị</span>
          <small>Có thể chọn nhiều ảnh cùng lúc</small>
        </label>

        {previews.length > 0 && (
          <div className="handover-preview-grid">
            {previews.map((previewUrl, index) => (
              <img key={previewUrl} src={previewUrl} alt={`Ảnh xác nhận ${index + 1}`} />
            ))}
          </div>
        )}

        <div className="rental-modal-actions">
          <button className="btn-xs btn-ghost-xs" type="button" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button className="btn-xs btn-primary-xs" type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : copy.button}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HandoverModal;
