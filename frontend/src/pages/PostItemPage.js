import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function PostItemPage() {
  const { itemId } = useParams();
  const isEditMode = Boolean(itemId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [pageLoading, setPageLoading] = useState(isEditMode);

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (isEditMode) {
      const fetchItemData = async () => {
        try {
          const response = await apiService.getItemDetails(itemId);
          const item = response.data;

          // >>> SỬA: So sánh bằng _id thay vì email
          if (!user || user._id !== item.owner._id) {
             setApiError("You don't have permission to edit this item.");
             setPageLoading(false);
             return;
          }

          setValue('name', item.name);
          setValue('description', item.description);
          setValue('pricePerDay', item.pricePerDay);
          setValue('address', item.address);

          if (item.images && item.images.length > 0) {
            setImageUrl(item.images[0]);
          }

        } catch (err) {
          setApiError('Failed to load item data.');
        }
        setPageLoading(false);
      };
      fetchItemData();
    }
    // eslint-disable-next-line
  }, [itemId, isEditMode, setValue, user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    let finalImageUrl = imageUrl;

    try {
      if (imageFile) {
        setUploading(true);
        const uploadResponse = await apiService.uploadImage(imageFile);
        finalImageUrl = uploadResponse.data.imageUrl;
        setUploading(false);
      }

      const itemData = {
        ...data,
        images: finalImageUrl ? [finalImageUrl] : []
      };

      if (isEditMode) {
        await apiService.updateItem(itemId, itemData);
        alert('Item updated successfully!');
        navigate(`/items/${itemId}`);
      } else {
        if (!finalImageUrl) {
          setApiError('Please upload an image.');
          setLoading(false);
          return;
        }
        const createdItem = await apiService.createItem(itemData);
        alert('Item created successfully!');
        navigate(`/items/${createdItem.data._id}`);
      }

    } catch (err) {
      setApiError('An error occurred. Please try again.');
      console.error(err);
      setLoading(false);
      setUploading(false);
    }
  };
  
  if (pageLoading) {
    return <div className="container py-5 text-center">Loading item data...</div>;
  }

  return (
    <>
      <div className="container-fluid page-header py-5">
         <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
            {isEditMode ? 'Chỉnh sửa vật phẩm' : 'Đăng vật phẩm mới'}
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><a href="/">Trang chủ</a></li>
          <li className="breadcrumb-item active text-white">{isEditMode ? 'Chỉnh sửa' : 'Đăng vật phẩm'}</li>
        </ol>
      </div>

      <div className="container-fluid bg-light overflow-hidden py-5">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-12 col-lg-8 col-xl-8 wow fadeInUp" data-wow-delay="0.1s">

              <form onSubmit={handleSubmit(onSubmit)}>
                {apiError && (
                  <div className="alert alert-danger" role="alert">{apiError}</div>
                )}

                <div className="card shadow-sm p-4 mb-4">
                  <div className="mb-3">
                    <label className="form-label">Tên vật phẩm <sup>*</sup></label>
                    <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: 'Vui lòng nhập tên vật phẩm' })} />
                    {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea className="form-control" rows="5" {...register('description')} placeholder="Mô tả ngắn gọn về tình trạng, phụ kiện, lưu ý..." />
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Giá thuê /ngày (VND) <sup>*</sup></label>
                      <input type="number" className={`form-control ${errors.pricePerDay ? 'is-invalid' : ''}`} {...register('pricePerDay', { required: 'Vui lòng nhập giá thuê', valueAsNumber: true, min: { value: 1000, message: 'Giá tối thiểu là 1000 VND' } })} />
                      {errors.pricePerDay && <div className="invalid-feedback">{errors.pricePerDay.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Địa điểm nhận/trả <sup>*</sup></label>
                      <input type="text" className={`form-control ${errors.address ? 'is-invalid' : ''}`} {...register('address', { required: 'Vui lòng nhập địa điểm' })} />
                      {errors.address && <div className="invalid-feedback">{errors.address.message}</div>}
                    </div>
                  </div>

                  <div className="mb-3 mt-3">
                    <label className="form-label">Ảnh đại diện <sup>*</sup></label>
                    <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} />
                    {uploading && <div className="text-muted mt-2">Đang tải ảnh...</div>}
                    {imageUrl && (
                      <div className="mt-3">
                        <div className="border rounded" style={{ width: 220, height: 220, overflow: 'hidden' }}>
                          <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <small className="text-muted">Các trường có dấu * là bắt buộc.</small>
                    <div>
                      <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate(-1)} disabled={loading || uploading}>Hủy</button>
                      <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
                        {loading ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi' : 'Đăng vật phẩm')}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PostItemPage;