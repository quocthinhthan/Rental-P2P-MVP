import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Swal from 'sweetalert2';
import apiService from '../../services/api';

function SignatureModal({ isOpen, rental, onClose, onSigned }) {
  const signatureRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !rental) return null;

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const buildSignatureFile = () =>
    new Promise((resolve, reject) => {
      const canvas = signatureRef.current?.getCanvas();

      if (!canvas) {
        reject(new Error('Không thể đọc chữ ký.'));
        return;
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Không thể tạo ảnh chữ ký.'));
          return;
        }

        resolve(new File([blob], `chu-ky-hop-dong-${rental._id}.png`, { type: 'image/png' }));
      }, 'image/png');
    });

  const handleSaveSignature = async () => {
    if (signatureRef.current?.isEmpty()) {
      Swal.fire('Thiếu chữ ký', 'Vui lòng ký vào khung trắng trước khi lưu.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const signatureFile = await buildSignatureFile();
      const uploadResponse = await apiService.uploadImage(signatureFile);
      const signatureUrl = uploadResponse.data.imageUrl;

      await apiService.signContract(rental._id, signatureUrl);
      Swal.fire('Thành công!', 'Chữ ký hợp đồng đã được lưu.', 'success');
      onSigned?.();
      onClose();
    } catch (err) {
      Swal.fire(
        'Lỗi!',
        err.response?.data?.message || err.message || 'Không thể lưu chữ ký. Vui lòng thử lại.',
        'error'
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal signature-modal">
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow">Hợp đồng điện tử</p>
            <h3>Ký hợp đồng thuê</h3>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>

        <p className="rental-modal-subtitle">
          Vui lòng ký vào vùng trắng bên dưới. Chữ ký sẽ được lưu thành ảnh và đính kèm vào hợp đồng.
        </p>

        <div className="signature-pad-wrap">
          <SignatureCanvas
            ref={signatureRef}
            penColor="#111827"
            canvasProps={{
              className: 'signature-pad',
              'aria-label': 'Vùng ký hợp đồng điện tử',
            }}
          />
        </div>

        <div className="rental-modal-actions">
          <button className="btn-xs btn-ghost-xs" type="button" onClick={clearSignature} disabled={submitting}>
            Xóa / Làm lại
          </button>
          <button className="btn-xs btn-primary-xs" type="button" onClick={handleSaveSignature} disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu chữ ký'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignatureModal;
