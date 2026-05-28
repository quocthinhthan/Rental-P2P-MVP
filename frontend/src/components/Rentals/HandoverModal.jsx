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

function HandoverModal({ isOpen, rental, type = 'pickup', report, onClose, onSuccess }) {
  const [isEditing, setIsEditing] = useState(true);
  const [previews, setPreviews] = useState([]);
  const [condition, setCondition] = useState('good');
  const [accessories, setAccessories] = useState('Đầy đủ phụ kiện theo mô tả');
  const [damages, setDamages] = useState('Không có hư hại phát sinh');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const copy = modalCopy[type] || modalCopy.pickup;
  const isPickup = type === 'pickup';

  useEffect(() => {
    if (isOpen) {
      if (report) {
        const reportImages = isPickup ? (rental.pickupImages || []) : (rental.returnImages || []);
        setPreviews(reportImages.map((url) => ({ url, isRemote: true })));
        setCondition(report.condition || 'good');
        setAccessories(report.accessories || 'Đầy đủ phụ kiện theo mô tả');
        setDamages(report.damages || 'Không có hư hại phát sinh');
        setNotes(report.notes || '');
        setIsEditing(false);
      } else {
        setPreviews([]);
        setCondition('good');
        setAccessories('Đầy đủ phụ kiện theo mô tả');
        setDamages('Không có hư hại phát sinh');
        setNotes('');
        setIsEditing(true);
      }
    }
  }, [isOpen, report, rental, isPickup]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (!p.isRemote && p.url.startsWith('blob:')) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, [previews]);

  if (!isOpen || !rental) return null;

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const totalCount = previews.length + selectedFiles.length;
    if (totalCount > 3) {
      Swal.fire({
        title: 'Giới hạn số lượng ảnh! 📸',
        text: 'Bạn chỉ được tải lên tối đa 3 hình ảnh xác minh.',
        icon: 'warning',
        confirmButtonColor: '#ffb524'
      });
      event.target.value = '';
      return;
    }

    const nextPreviews = selectedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      isRemote: false,
      file,
    }));

    setPreviews((prev) => [...prev, ...nextPreviews]);
    event.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    setPreviews((prev) => {
      const item = prev[indexToRemove];
      if (item && !item.isRemote && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (previews.length === 0) {
      Swal.fire('Thiếu ảnh xác nhận', copy.missing, 'warning');
      return;
    }

    try {
      setSubmitting(true);

      if (report) {
        // Phê duyệt biên bản (chúng ta là đối phương)
        if (!isEditing) {
          // Không chỉnh sửa, duyệt trực tiếp với các thông tin đã lưu
          if (isPickup) {
            await apiService.approvePickup(rental._id);
          } else {
            await apiService.approveReturn(rental._id);
          }
        } else {
          // Có chỉnh sửa thông tin! Tải các ảnh local mới lên Cloudinary trước
          const remoteUrls = previews.filter((p) => p.isRemote).map((p) => p.url);
          const localFiles = previews.filter((p) => !p.isRemote).map((p) => p.file);

          let uploadedUrls = [];
          if (localFiles.length > 0) {
            uploadedUrls = await apiService.uploadImages(localFiles);
          }

          const finalImages = [...remoteUrls, ...uploadedUrls];
          const payload = {
            condition: condition.trim(),
            accessories: accessories.trim(),
            notes: notes.trim(),
          };

          if (isPickup) {
            payload.pickupImages = finalImages;
            await apiService.approvePickup(rental._id, payload);
          } else {
            payload.damages = damages.trim();
            payload.returnImages = finalImages;
            await apiService.approveReturn(rental._id, payload);
          }
        }
      } else {
        // Tự ghi nhận biên bản lần đầu
        const localFiles = previews.filter((p) => !p.isRemote).map((p) => p.file);
        const imageUrls = await apiService.uploadImages(localFiles);

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
      }

      Swal.fire({
        title: 'Thành công! 🎉',
        text: report ? 'Đã duyệt biên bản thành công.' : copy.success,
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
              {report ? (isEditing ? 'Chỉnh sửa biên bản giao nhận' : 'Xem & Duyệt biên bản giao nhận') : copy.title}
            </h3>
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
            {report ? (
              isEditing ? 'Bạn đang chỉnh sửa lại biên bản đã được đối phương ghi nhận.' : 'Vui lòng kiểm tra lại biên bản tình trạng thực tế dưới đây.'
            ) : copy.subtitle}
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
                disabled={submitting || !isEditing}
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
                disabled={submitting || !isEditing}
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
                  disabled={submitting || !isEditing}
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
                disabled={submitting || !isEditing}
              />
            </div>

            {/* Tải lên ảnh (Chỉ hiển thị khi có quyền chỉnh sửa) */}
            {isEditing && (
              <div className="mb-3">
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                  Tải thêm/thay thế hình ảnh thực tế <span style={{ color: '#dc2626' }}>*</span>
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
                  <span style={{ color: '#ffb524', fontWeight: '600', fontSize: '0.95rem' }}>📸 Chọn ảnh tải lên</span>
                  <small style={{ color: '#6b7280', marginTop: '4px' }}>Tổng tối đa 3 ảnh xác minh (tổng dưới 5MB)</small>
                </label>
              </div>
            )}

            {/* Preview ảnh */}
            {previews.length > 0 && (
              <div className="mb-3">
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '6px' }}>
                  Hình ảnh xác minh hiện có <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div 
                  className="handover-preview-grid"
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                    gap: '8px', 
                    marginTop: '4px' 
                  }}
                >
                  {previews.map((item, index) => (
                    <div key={item.url} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                      <img 
                        src={item.url} 
                        alt={`Ảnh thực tế ${index + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {isEditing && (
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
                      )}
                    </div>
                  ))}
                </div>
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
            {report && !isEditing && (
              <button 
                className="btn-xs btn-outline-warning" 
                type="button" 
                onClick={() => setIsEditing(true)} 
                disabled={submitting}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #f59e0b', color: '#d97706', cursor: 'pointer', backgroundColor: '#fffbeb', fontWeight: '600' }}
              >
                ✏️ Chỉnh sửa thông tin
              </button>
            )}
            <button 
              className="btn-xs btn-primary-xs" 
              type="submit" 
              disabled={submitting}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#ffb524', color: '#fff', fontWeight: '600' }}
            >
              {submitting ? 'Đang xử lý...' : (report && !isEditing ? 'Đồng ý & Xác nhận' : copy.button)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HandoverModal;
