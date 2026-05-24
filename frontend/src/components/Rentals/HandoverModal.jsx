import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import apiService from '../../services/api';

const modalCopy = {
  pickup: {
    eyebrow: 'Bàn giao đồ dùng',
    title: 'Biên bản bàn giao sản phẩm',
    subtitle: 'Vui lòng xác nhận tình trạng, phụ kiện đi kèm và chụp ít nhất 1 ảnh thực tế khi bàn giao sản phẩm.',
    button: 'Xác nhận bàn giao',
    success: 'Đã xác nhận bàn giao thành công. Đơn thuê đã chuyển sang trạng thái đang thuê.',
    missing: 'Vui lòng tải lên ít nhất 1 ảnh bàn giao sản phẩm.',
  },
  return: {
    eyebrow: 'Nhận lại đồ dùng',
    title: 'Biên bản hoàn tất trả đồ',
    subtitle: 'Vui lòng xác nhận tình trạng thu hồi, phụ kiện đầy đủ hay hao mòn, hư hại phát sinh kèm ít nhất 1 ảnh thực tế.',
    button: 'Xác nhận trả đồ',
    success: 'Đã hoàn tất trả đồ. Giao dịch thuê thành công!',
    missing: 'Vui lòng tải lên ít nhất 1 ảnh tình trạng thực tế khi trả đồ.',
  },
};

function HandoverModal({ isOpen, rental, type = 'pickup', onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [condition, setCondition] = useState('Hoạt động tốt, nguyên vẹn');
  const [accessories, setAccessories] = useState('Đầy đủ phụ kiện theo mô tả');
  const [damages, setDamages] = useState('Không có hư hại phát sinh');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const copy = modalCopy[type] || modalCopy.pickup;
  const isPickup = type === 'pickup';

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setPreviews([]);
      setCondition('good');
      setAccessories('Đầy đủ phụ kiện theo mô tả');
      setDamages('Không có hư hại phát sinh');
      setNotes('');
    }
  }, [isOpen, isPickup]);

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
    if (selectedFiles.length === 0) return;

    const combinedFiles = [...files, ...selectedFiles];

    if (combinedFiles.length > 3) {
      Swal.fire({
        title: 'Giới hạn số lượng ảnh! 📸',
        text: 'Bạn chỉ được tải lên tối đa 3 hình ảnh xác minh.',
        icon: 'warning',
        confirmButtonColor: '#ffb524'
      });
      event.target.value = '';
      return;
    }

    const totalSize = combinedFiles.reduce((acc, file) => acc + file.size, 0);
    const maxSizeBytes = 5 * 1024 * 1024;
    if (totalSize > maxSizeBytes) {
      Swal.fire({
        title: 'Dung lượng quá lớn! 💾',
        text: 'Tổng dung lượng các ảnh tải lên không được vượt quá 5MB.',
        icon: 'warning',
        confirmButtonColor: '#ffb524'
      });
      event.target.value = '';
      return;
    }

    setFiles(combinedFiles);
    event.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      Swal.fire('Thiếu ảnh xác nhận', copy.missing, 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const imageUrls = await apiService.uploadImages(files);

      if (isPickup) {
        await apiService.pickupRental(rental._id, {
          pickupImages: imageUrls,
          condition: condition.trim(),
          accessories: accessories.trim(),
          notes: notes.trim(),
        });
      } else {
        await apiService.completeRental(rental._id, {
          returnImages: imageUrls,
          condition: condition.trim(),
          accessories: accessories.trim(),
          damages: damages.trim(),
          notes: notes.trim(),
        });
      }

      Swal.fire({
        title: 'Thành công! 🎉',
        text: copy.success,
        icon: 'success',
        confirmButtonColor: '#ffb524'
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      Swal.fire(
        'Thất bại ⚠️',
        err.response?.data?.message || 'Có lỗi xảy ra trong quá trình cập nhật biên bản. Vui lòng thử lại.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="rental-modal handover-modal" style={{ maxWidth: '600px', width: '90%', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="rental-modal-header" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <p className="rental-modal-eyebrow" style={{ color: '#ffb524', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              {isPickup ? '📦 ' : '🔄 '} {copy.eyebrow}
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>{copy.title}</h3>
          </div>
          <button 
            className="modal-close-btn" 
            type="button" 
            onClick={onClose} 
            disabled={submitting} 
            aria-label="Đóng"
            style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="rental-modal-subtitle" style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '20px', lineHeight: '1.5' }}>
            {copy.subtitle}
          </p>

          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
            {/* Tình trạng */}
            <div className="mb-3">
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                Tình trạng sản phẩm thực tế <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-select"
                style={{ borderRadius: '8px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '0.9rem', width: '100%', backgroundColor: '#fff' }}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="good">Tốt / Nguyên vẹn</option>
                <option value="fair">Bình thường / Hao mòn nhẹ</option>
                <option value="damaged">Hư hỏng / Hao mòn nhiều</option>
              </select>
            </div>

            {/* Phụ kiện */}
            <div className="mb-3">
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                Số lượng phụ kiện đi kèm <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                style={{ borderRadius: '8px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '0.9rem' }}
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                placeholder="Ví dụ: Đầy đủ pin, sạc và túi chống sốc..."
                required
                disabled={submitting}
              />
            </div>

            {/* Hao mòn / Hư hại (chỉ cho complete) */}
            {!isPickup && (
              <div className="mb-3">
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                  Hao mòn / Hư hại phát sinh <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ borderRadius: '8px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '0.9rem' }}
                  value={damages}
                  onChange={(e) => setDamages(e.target.value)}
                  placeholder="Ví dụ: Không có hao mòn, hoặc bị nứt vỏ nhẹ..."
                  required
                  disabled={submitting}
                />
              </div>
            )}

            {/* Ghi chú thêm */}
            <div className="mb-3">
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                Ghi chú thêm (nếu có)
              </label>
              <textarea
                className="form-control"
                rows="2"
                style={{ borderRadius: '8px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '0.9rem' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập ghi chú thêm cho đối tác..."
                disabled={submitting}
              />
            </div>

            {/* Tải lên ảnh */}
            <div className="mb-3">
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                Hình ảnh thực tế xác minh <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <label 
                className="handover-upload-box"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: '2px dashed #d1d5db', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb',
                  transition: 'border-color 0.2s'
                }}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  disabled={submitting} 
                  style={{ display: 'none' }}
                />
                <span style={{ color: '#ffb524', fontWeight: '600', fontSize: '0.95rem' }}>📸 Chọn hoặc kéo thả ảnh vào đây</span>
                <small style={{ color: '#6b7280', marginTop: '4px' }}>Tải lên tối đa 3 ảnh xác minh (tổng dung lượng dưới 5MB)</small>
              </label>
            </div>

            {/* Preview ảnh */}
            {previews.length > 0 && (
              <div 
                className="handover-preview-grid"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                  gap: '8px', 
                  marginTop: '12px' 
                }}
              >
                {previews.map((previewUrl, index) => (
                  <div key={previewUrl} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <img 
                      src={previewUrl} 
                      alt={`Ảnh thực tế ${index + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={submitting}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        lineHeight: 1
                      }}
                      title="Xóa ảnh này"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rental-modal-actions" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', display: 'flex', justifyContent: 'end', gap: '12px' }}>
            <button 
              className="btn-xs btn-ghost-xs" 
              type="button" 
              onClick={onClose} 
              disabled={submitting}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', backgroundColor: '#fff', color: '#374151' }}
            >
              Hủy
            </button>
            <button 
              className="btn-xs btn-primary-xs" 
              type="submit" 
              disabled={submitting}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#ffb524', color: '#fff', fontWeight: '600' }}
            >
              {submitting ? 'Đang xử lý...' : copy.button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HandoverModal;
