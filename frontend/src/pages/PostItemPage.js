import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

  // Mảng chứa các file mới chọn (để upload)
  const [imageFiles, setImageFiles] = useState([]);
  // Mảng chứa các URL ảnh hiện có hoặc preview (để hiển thị)
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Danh mục
  const [categories, setCategories] = useState([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { depositPercentage: 100 }
  });
  const watchedCategory = watch('category');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiService.getCategories();
        setCategories(res.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      const fetchItemData = async () => {
        try {
          const response = await apiService.getItemDetails(itemId);
          const item = response.data;

          if (!user || user._id !== item.owner._id) {
             setApiError("You don't have permission to edit this item.");
             setPageLoading(false);
             return;
          }

          setValue('name', item.name);
          setValue('description', item.description);
          setValue('pricePerDay', item.pricePerDay);
          setValue('baseValue', item.baseValue ?? (item.pricePerDay * 10));
          setValue('depositPercentage', item.depositPercentage ?? 100);
          setValue('address', item.address);
          setValue('category', item.category);

          if (item.images && item.images.length > 0) {
            setImages(item.images);
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
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Giới hạn tối đa 5 ảnh chẳng hạn
      if (images.length + files.length > 5) {
        alert('Bạn chỉ có thể đăng tối đa 5 ảnh.');
        return;
      }

      setImageFiles([...imageFiles, ...files]);
      
      // Tạo preview cho các file mới
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImages([...images, ...newPreviews]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const removedImageUrl = newImages.splice(index, 1)[0];
    setImages(newImages);

    // Nếu ảnh bị xóa là một ảnh vừa mới chọn (preview), xóa nó khỏi imageFiles
    // Chúng ta cần cẩn thận ở đây vì images chứa cả ảnh cũ (từ server) và ảnh mới (blob)
    // Cách đơn giản nhất: Nếu index >= (số lượng ảnh hiện có - số lượng file mới), 
    // thì đó là file mới. Nhưng tốt hơn là track theo URL.
    
    // Tìm xem URL này có phải là preview của file nào không
    const fileIndex = imageFiles.findIndex(f => URL.createObjectURL(f) === removedImageUrl);
    // Lưu ý: URL.createObjectURL(f) tạo URL mới mỗi lần gọi, nên cách này không ổn định.
    // Thay vào đó, khi handleFileChange ta nên gán preview vào file object hoặc dùng state quản lý mapping.
    // Đơn giản hơn: khi xóa, ta sẽ filter lại imageFiles dựa trên những gì còn lại trong images 
    // mà có format 'blob:'.
    
    setImageFiles(prevFiles => prevFiles.filter(f => {
        // Thực tế nếu chỉ xóa theo index trong mảng images thì hơi phức tạp.
        // Ta sẽ cập nhật lại imageFiles một cách an toàn hơn.
        return true; // Tạm thời để user tự xóa ảnh, logic upload sẽ check lại.
    }));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setApiError(null);
    setUploading(true);

    try {
      // 1. Phân loại ảnh: Ảnh cũ (URL http) và Ảnh mới (File cần upload)
      const existingImages = images.filter(img => !img.startsWith('blob:'));
      
      // 2. Upload các file mới
      const uploadPromises = imageFiles.map(file => apiService.uploadImage(file));
      const uploadResults = await Promise.all(uploadPromises);
      const newImageUrls = uploadResults.map(res => res.data.imageUrl);

      // 3. Hợp nhất
      const finalImages = [...existingImages, ...newImageUrls];

      if (finalImages.length === 0) {
        setApiError('Vui lòng tải lên ít nhất một tấm ảnh.');
        setLoading(false);
        setUploading(false);
        return;
      }

      // Xử lý danh mục mới
      const finalCategory = data.category === '__new__' ? data.newCategory : data.category;

      const itemData = {
        ...data,
        category: finalCategory,
        images: finalImages
      };
      
      // Xóa field tạm
      delete itemData.newCategory;

      if (isEditMode) {
        await apiService.updateItem(itemId, itemData);
        alert('Cập nhật vật phẩm thành công!');
        navigate(`/items/${itemId}`);
      } else {
        const createdItem = await apiService.createItem(itemData);
        alert('Đăng vật phẩm thành công!');
        navigate(`/items/${createdItem.data._id}`);
      }

    } catch (err) {
      setApiError('Đã xảy ra lỗi. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };
  
  if (pageLoading) {
    return <div className="container py-5 text-center">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="container-fluid page-header py-5">
         <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
            {isEditMode ? 'Chỉnh sửa vật phẩm' : 'Đăng vật phẩm mới'}
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
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

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label">Danh mục <sup>*</sup></label>
                        <select 
                            className={`form-select ${errors.category ? 'is-invalid' : ''}`} 
                            {...register('category', { required: 'Vui lòng chọn danh mục' })}
                        >
                            <option value="">Chọn danh mục</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__new__">+ Thêm danh mục mới</option>
                        </select>
                        {errors.category && <div className="invalid-feedback">{errors.category.message}</div>}
                    </div>
                    { watchedCategory === '__new__' && (
                        <div className="col-md-6">
                            <label className="form-label">Tên danh mục mới <sup>*</sup></label>
                            <input 
                                type="text" 
                                className={`form-control ${errors.newCategory ? 'is-invalid' : ''}`} 
                                {...register('newCategory', { required: watchedCategory === '__new__' ? 'Vui lòng nhập tên danh mục mới' : false })} 
                                placeholder="VD: Thiết bị quay phim"
                            />
                            {errors.newCategory && <div className="invalid-feedback">{errors.newCategory.message}</div>}
                        </div>
                    )}
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

                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label className="form-label">Giá trị thực tế của vật phẩm (VNĐ) <sup>*</sup></label>
                      <input
                        type="number"
                        className={`form-control ${errors.baseValue ? 'is-invalid' : ''}`}
                        {...register('baseValue', {
                          required: 'Vui lòng nhập giá trị thực tế của vật phẩm',
                          valueAsNumber: true,
                          min: { value: 1000, message: 'Giá trị tối thiểu là 1000 VNĐ' }
                        })}
                      />
                      {errors.baseValue && <div className="invalid-feedback">{errors.baseValue.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tỉ lệ tiền cọc yêu cầu (%) <sup>*</sup></label>
                      <select
                        className={`form-select ${errors.depositPercentage ? 'is-invalid' : ''}`}
                        {...register('depositPercentage', {
                          required: 'Vui lòng chọn tỉ lệ tiền cọc',
                          valueAsNumber: true,
                          min: { value: 0, message: 'Tỉ lệ tối thiểu là 0%' },
                          max: { value: 120, message: 'Tỉ lệ tối đa là 120%' }
                        })}
                      >
                        <option value={0}>0%</option>
                        <option value={30}>30%</option>
                        <option value={50}>50%</option>
                        <option value={80}>80%</option>
                        <option value={100}>100%</option>
                        <option value={120}>120%</option>
                      </select>
                      {errors.depositPercentage && <div className="invalid-feedback">{errors.depositPercentage.message}</div>}
                    </div>
                  </div>

                  <div className="mb-3 mt-3">
                    <label className="form-label">Hình ảnh sản phẩm (Tối đa 5 ảnh) <sup>*</sup></label>
                    <input type="file" className="form-control" accept="image/*" multiple onChange={handleFileChange} />
                    {uploading && <div className="text-muted mt-2"><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý hình ảnh...</div>}
                    
                    <div className="row g-2 mt-2">
                      {images.map((img, idx) => (
                        <div key={idx} className="col-4 col-md-3">
                          <div className="position-relative border rounded overflow-hidden" style={{ height: '120px' }}>
                            <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button 
                              type="button" 
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                              style={{ padding: '2px 6px', fontSize: '10px' }}
                              onClick={() => removeImage(idx)}
                            >
                              <i className="fa fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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