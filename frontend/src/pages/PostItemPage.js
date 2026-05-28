import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import 'leaflet/dist/leaflet.css';
import '../styles/PostItemPage.css';
import { sanitizeDescription } from '../utils/sanitize';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const DEFAULT_ITEM_LOCATION = {
  lat: 10.7321,
  lng: 106.6999,
};

const TILE_SOURCES = [
  {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
];

const itemLocationIcon = L.divIcon({
  className: 'post-item-location-marker',
  html: '<span class="post-item-location-marker-inner"><i class="fas fa-map-marker-alt"></i></span>',
  iconSize: [42, 48],
  iconAnchor: [21, 44],
});

function LocationMapEvents({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function LocationMapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.45,
    });

    const timers = [80, 240, 520].map((delay) => (
      window.setTimeout(() => map.invalidateSize(), delay)
    ));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [center, map]);

  return null;
}

const editorConfiguration = {
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'blockQuote',
    '|',
    'undo',
    'redo'
  ],
  placeholder: 'Mô tả chi tiết tình trạng, phụ kiện đi kèm, hướng dẫn sử dụng và các điều khoản khác...'
};

function PostItemPage() {
  const { itemId } = useParams();
  const isEditMode = Boolean(itemId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [imageFiles, setImageFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [tileSourceIndex, setTileSourceIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      depositPercentage: 100,
      lat: '',
      lng: '',
      address: '',
    },
  });

  const watchedCategory = watch('category');
  const watchDescription = watch('description');

  const mapCenter = selectedLocation || DEFAULT_ITEM_LOCATION;
  const tileSource = TILE_SOURCES[tileSourceIndex];

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
    if (!isEditMode) return;

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

        if (item.mapLocation) {
          const nextLocation = {
            lat: Number(item.mapLocation.lat),
            lng: Number(item.mapLocation.lng),
          };
          setSelectedLocation(nextLocation);
          setValue('lat', nextLocation.lat, { shouldValidate: true });
          setValue('lng', nextLocation.lng, { shouldValidate: true });
        }

        if (item.images && item.images.length > 0) {
          setImages(item.images);
        }
      } catch (err) {
        setApiError('Failed to load item data.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchItemData();
  }, [itemId, isEditMode, setValue, user]);

  const formatCurrency = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? `${numericValue.toLocaleString('vi-VN')} VNĐ`
      : 'Chưa có dữ liệu';
  };

  const reverseGeocode = async ({ lat, lng }) => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'vi',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const setPickedLocation = async (location, shouldLookupAddress = true) => {
    const normalizedLocation = {
      lat: Number(location.lat),
      lng: Number(location.lng),
    };

    setSelectedLocation(normalizedLocation);
    setLocationError('');
    setValue('lat', normalizedLocation.lat, { shouldValidate: true, shouldDirty: true });
    setValue('lng', normalizedLocation.lng, { shouldValidate: true, shouldDirty: true });

    if (!shouldLookupAddress) return;

    setLocationLoading(true);
    try {
      const address = await reverseGeocode(normalizedLocation);
      setValue('address', address, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      setValue(
        'address',
        `${normalizedLocation.lat.toFixed(6)}, ${normalizedLocation.lng.toFixed(6)}`,
        { shouldValidate: true, shouldDirty: true }
      );
      setLocationError('Chưa lấy được địa chỉ chữ. Bạn có thể nhập lại địa chỉ thủ công.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Trình duyệt chưa hỗ trợ lấy vị trí hiện tại.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationLoading(false);
        setLocationError('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền vị trí hoặc chọn trực tiếp trên bản đồ.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      Swal.fire('Thông báo', 'Bạn chỉ có thể đăng tối đa 5 ảnh.', 'warning');
      return;
    }

    setImageFiles((currentFiles) => [...currentFiles, ...files]);
    setImages((currentImages) => [
      ...currentImages,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removeImage = (index) => {
    setImages((currentImages) => {
      const removedImage = currentImages[index];

      if (removedImage?.startsWith('blob:')) {
        const removedFileIndex = currentImages
          .slice(0, index + 1)
          .filter((image) => image.startsWith('blob:')).length - 1;

        setImageFiles((currentFiles) => (
          currentFiles.filter((_, fileIndex) => fileIndex !== removedFileIndex)
        ));
        URL.revokeObjectURL(removedImage);
      }

      return currentImages.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const handleSuggestPrice = async () => {
    const values = getValues();
    const finalCategory = values.category === '__new__' ? values.newCategory : values.category;
    const payload = {
      name: values.name?.trim(),
      category: finalCategory,
      baseValue: values.baseValue,
      description: values.description?.trim(),
    };

    if (!payload.name || !payload.baseValue || Number(payload.baseValue) <= 0) {
      setSuggestionError('Vui lòng nhập tên món đồ và giá trị thực tế trước khi gợi ý giá.');
      setPriceSuggestion(null);
      return;
    }

    setSuggestingPrice(true);
    setSuggestionError(null);

    try {
      const response = await apiService.suggestItemPrice(payload);
      setPriceSuggestion(response.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể lấy gợi ý giá lúc này. Vui lòng thử lại sau.';
      setSuggestionError(message);
      setPriceSuggestion(null);
    } finally {
      setSuggestingPrice(false);
    }
  };

  const applySuggestedPrice = () => {
    if (!priceSuggestion?.finalSuggestion) return;
    setValue('pricePerDay', priceSuggestion.finalSuggestion, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data) => {
    const hasBankDetails = user?.bankAccount?.bankName && user?.bankAccount?.accountNumber && user?.bankAccount?.accountHolder;
    if (!hasBankDetails) {
      Swal.fire({
        title: 'Yêu cầu điền thông tin ngân hàng ⚠️',
        text: 'Để đảm bảo việc nhận thanh toán/tiền thuê tự động từ hệ thống, bạn vui lòng điền thông tin tài khoản ngân hàng trong phần Thông tin cá nhân trước khi đăng vật phẩm cho thuê.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cập nhật ngay',
        cancelButtonText: 'Để sau',
        confirmButtonColor: '#ffb524',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/account');
        }
      });
      return;
    }

    setLoading(true);
    setApiError(null);
    setUploading(true);

    try {
      const existingImages = images.filter((img) => !img.startsWith('blob:'));
      const uploadPromises = imageFiles.map((file) => apiService.uploadImage(file));
      const uploadResults = await Promise.all(uploadPromises);
      const newImageUrls = uploadResults.map((res) => res.data.imageUrl);
      const finalImages = [...existingImages, ...newImageUrls];

      if (finalImages.length === 0) {
        setApiError('Vui lòng tải lên ít nhất một tấm ảnh.');
        return;
      }

      const finalCategory = data.category === '__new__' ? data.newCategory : data.category;
      const itemData = {
        ...data,
        category: finalCategory,
        images: finalImages,
        lat: selectedLocation?.lat ?? data.lat,
        lng: selectedLocation?.lng ?? data.lng,
      };

      delete itemData.newCategory;

      if (isEditMode) {
        await apiService.updateItem(itemId, itemData);
        await Swal.fire('Thành công!', 'Cập nhật vật phẩm thành công!', 'success');
        navigate(`/items/${itemId}`);
      } else {
        const createdItem = await apiService.createItem(itemData);
        await Swal.fire('Thành công!', 'Đăng vật phẩm thành công!', 'success');
        navigate(`/items/${createdItem.data._id}`);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
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
      <div className="container-fluid page-header post-item-page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          {isEditMode ? 'Chỉnh sửa vật phẩm' : 'Đăng vật phẩm mới'}
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item active text-white">{isEditMode ? 'Chỉnh sửa' : 'Đăng vật phẩm'}</li>
        </ol>
      </div>

      <div className="container-fluid bg-light overflow-hidden py-5">
        <div className="container py-4">
          <form onSubmit={handleSubmit(onSubmit)} className="post-item-form">
            {apiError && (
              <div className="alert alert-danger" role="alert">{apiError}</div>
            )}

            <input type="hidden" {...register('lat', { required: 'Vui lòng chọn vị trí trên bản đồ.' })} />
            <input type="hidden" {...register('lng', { required: 'Vui lòng chọn vị trí trên bản đồ.' })} />

            <div className="row g-4 align-items-start">
              <div className="col-lg-7">
                <div className="post-item-card">
                  <div className="post-item-section-heading">
                    <span className="post-item-step">1</span>
                    <div>
                      <h2>Thông tin vật phẩm</h2>
                      <p>Tên, mô tả và giá trị giúp người thuê hiểu món đồ trước khi đặt.</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Tên vật phẩm <sup>*</sup></label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      {...register('name', { required: 'Vui lòng nhập tên vật phẩm' })}
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    
                    <div className="custom-editor-container">
                      <div className="custom-editor-toolbar d-flex flex-wrap align-items-center gap-1 p-2 bg-light border border-bottom-0 rounded-top">
                        <div className="fw-semibold text-muted small px-2">
                          <i className="fas fa-edit me-1"></i> Trình soạn thảo mô tả
                        </div>
                        
                        <div className="ms-auto d-flex gap-1">
                          <button
                            type="button"
                            className={`btn btn-xs py-1 px-2 btn-preview-tab ${!showPreview ? 'btn-primary text-white' : 'btn-light border-0 text-dark'}`}
                            onClick={() => setShowPreview(false)}
                            style={{ fontSize: '0.78rem', borderRadius: '4px' }}
                          >
                            <i className="fas fa-pencil-alt me-1"></i> Soạn thảo
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs py-1 px-2 btn-preview-tab ${showPreview ? 'btn-primary text-white' : 'btn-light border-0 text-dark'}`}
                            onClick={() => setShowPreview(true)}
                            style={{ fontSize: '0.78rem', borderRadius: '4px' }}
                          >
                            <i className="fas fa-eye me-1"></i> Xem trước bài đăng
                          </button>
                        </div>
                      </div>

                      <input type="hidden" {...register('description')} />

                      {!showPreview ? (
                        <div className="ckeditor-wrapper border rounded-bottom bg-white">
                          <CKEditor
                            editor={ClassicEditor}
                            config={editorConfiguration}
                            data={watchDescription || ''}
                            onChange={(event, editor) => {
                              const data = editor.getData();
                              setValue('description', data, { shouldDirty: true, shouldValidate: true });
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="custom-editor-preview p-4 border rounded-bottom bg-white overflow-auto text-start" 
                          style={{ minHeight: '300px', maxHeight: '500px', borderTop: 'none' }}
                        >
                          {watchDescription ? (
                            <div 
                              className="idp-desc-text"
                              dangerouslySetInnerHTML={{ __html: sanitizeDescription(watchDescription) }}
                            />
                          ) : (
                            <em className="text-muted small">Nội dung xem trước sẽ hiển thị ở đây khi bạn nhập mô tả...</em>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Danh mục <sup>*</sup></label>
                      <select
                        className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                        {...register('category', { required: 'Vui lòng chọn danh mục' })}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__new__">+ Thêm danh mục mới</option>
                      </select>
                      {errors.category && <div className="invalid-feedback">{errors.category.message}</div>}
                    </div>

                    {watchedCategory === '__new__' && (
                      <div className="col-md-6">
                        <label className="form-label">Tên danh mục mới <sup>*</sup></label>
                        <input
                          type="text"
                          className={`form-control ${errors.newCategory ? 'is-invalid' : ''}`}
                          {...register('newCategory', {
                            required: watchedCategory === '__new__' ? 'Vui lòng nhập tên danh mục mới' : false,
                          })}
                          placeholder="VD: Thiết bị quay phim"
                        />
                        {errors.newCategory && <div className="invalid-feedback">{errors.newCategory.message}</div>}
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Giá thuê/ngày (VND) <sup>*</sup></label>
                      <input
                        type="number"
                        className={`form-control ${errors.pricePerDay ? 'is-invalid' : ''}`}
                        {...register('pricePerDay', {
                          required: 'Vui lòng nhập giá thuê',
                          valueAsNumber: true,
                          min: { value: 1000, message: 'Giá tối thiểu là 1000 VND' },
                        })}
                      />
                      {errors.pricePerDay && <div className="invalid-feedback">{errors.pricePerDay.message}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Giá trị thực tế (VNĐ) <sup>*</sup></label>
                      <input
                        type="number"
                        className={`form-control ${errors.baseValue ? 'is-invalid' : ''}`}
                        {...register('baseValue', {
                          required: 'Vui lòng nhập giá trị thực tế của vật phẩm',
                          valueAsNumber: true,
                          min: { value: 1000, message: 'Giá trị tối thiểu là 1000 VNĐ' },
                        })}
                      />
                      {errors.baseValue && <div className="invalid-feedback">{errors.baseValue.message}</div>}
                    </div>
                  </div>

                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label className="form-label">Tỉ lệ tiền cọc yêu cầu (%) <sup>*</sup></label>
                      <select
                        className={`form-select ${errors.depositPercentage ? 'is-invalid' : ''}`}
                        {...register('depositPercentage', {
                          required: 'Vui lòng chọn tỉ lệ tiền cọc',
                          valueAsNumber: true,
                          min: { value: 0, message: 'Tỉ lệ tối thiểu là 0%' },
                          max: { value: 120, message: 'Tỉ lệ tối đa là 120%' },
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
                </div>

                <div className="post-item-card mt-4">
                  <div className="post-item-section-heading">
                    <span className="post-item-step">2</span>
                    <div>
                      <h2>Gợi ý giá bằng AI</h2>
                      <p>AI dùng thông tin vật phẩm và thị trường nội bộ để đề xuất giá thuê mỗi ngày.</p>
                    </div>
                  </div>

                  <div className="post-item-ai-panel">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                      <div>
                        <div className="fw-semibold text-dark">
                          <i className="fas fa-magic text-primary me-2"></i>
                          Định giá tự động
                        </div>
                        <div className="text-muted small">Bạn có thể áp dụng giá đề xuất hoặc tự điều chỉnh lại.</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary align-self-md-start"
                        onClick={handleSuggestPrice}
                        disabled={suggestingPrice || loading || uploading}
                      >
                        {suggestingPrice ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Đang gợi ý...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-magic me-2"></i>
                            Gợi ý giá
                          </>
                        )}
                      </button>
                    </div>

                    {suggestionError && (
                      <div className="alert alert-warning mt-3 mb-0" role="alert">{suggestionError}</div>
                    )}

                    {priceSuggestion && (
                      <div className="mt-3">
                        <div className="row g-2">
                          <div className="col-md-4">
                            <div className="post-item-price-card is-primary">
                              <span>Giá đề xuất</span>
                              <strong>{formatCurrency(priceSuggestion.finalSuggestion)}</strong>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="post-item-price-card">
                              <span>Theo công thức</span>
                              <strong>{formatCurrency(priceSuggestion.ruleBasedPrice)}</strong>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="post-item-price-card">
                              <span>AI phân tích</span>
                              <strong>{formatCurrency(priceSuggestion.aiSuggestedPrice)}</strong>
                            </div>
                          </div>
                        </div>

                        {priceSuggestion.marketContext && (
                          <div className="text-muted small mt-2">
                            <i className="fas fa-chart-line me-2"></i>
                            {priceSuggestion.marketContext}
                            {priceSuggestion.cached ? ' Kết quả này được lấy từ bộ nhớ tạm.' : ''}
                          </div>
                        )}

                        <button type="button" className="btn btn-primary btn-sm mt-3" onClick={applySuggestedPrice}>
                          Áp dụng giá đề xuất
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="post-item-card mt-4">
                  <div className="post-item-section-heading">
                    <span className="post-item-step">3</span>
                    <div>
                      <h2>Hình ảnh sản phẩm</h2>
                      <p>Đăng tối đa 5 ảnh rõ tình trạng và phụ kiện đi kèm.</p>
                    </div>
                  </div>

                  <input type="file" className="form-control" accept="image/*" multiple onChange={handleFileChange} />
                  {uploading && (
                    <div className="text-muted mt-2">
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang xử lý hình ảnh...
                    </div>
                  )}

                  <div className="row g-2 mt-2">
                    {images.map((img, idx) => (
                      <div key={`${img}-${idx}`} className="col-4 col-md-3">
                        <div className="post-item-image-preview">
                          <img src={img} alt={`Preview ${idx + 1}`} />
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeImage(idx)}>
                            <i className="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="post-item-card post-item-location-card">
                  <div className="post-item-section-heading">
                    <span className="post-item-step">4</span>
                    <div>
                      <h2>Vị trí nhận/trả</h2>
                      <p>Chọn chính xác trên bản đồ để người thuê tìm đồ quanh họ.</p>
                    </div>
                  </div>

                  <div className="post-item-map-wrap">
                    <MapContainer
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={15}
                      minZoom={5}
                      maxZoom={18}
                      scrollWheelZoom
                      className="post-item-map"
                    >
                      <TileLayer
                        attribution={tileSource.attribution}
                        url={tileSource.url}
                        eventHandlers={{
                          tileerror: () => {
                            setTileSourceIndex((currentIndex) => (
                              currentIndex < TILE_SOURCES.length - 1 ? currentIndex + 1 : currentIndex
                            ));
                          },
                        }}
                      />
                      <LocationMapEvents onPick={setPickedLocation} />
                      <LocationMapRecenter center={mapCenter} />
                      {selectedLocation && (
                        <Marker
                          position={[selectedLocation.lat, selectedLocation.lng]}
                          icon={itemLocationIcon}
                        />
                      )}
                    </MapContainer>
                  </div>

                  <div className="d-grid d-md-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleUseCurrentLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Đang xác định...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-location-crosshairs me-2"></i>
                          Dùng vị trí hiện tại
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="form-label">Địa chỉ nhận/trả <sup>*</sup></label>
                    <textarea
                      rows="3"
                      className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                      placeholder="Click trên bản đồ để tự điền địa chỉ"
                      {...register('address', { required: 'Vui lòng chọn vị trí hoặc nhập địa chỉ' })}
                    />
                    {errors.address && <div className="invalid-feedback">{errors.address.message}</div>}
                  </div>

                  <div className="post-item-coordinate-box mt-3">
                    {selectedLocation ? (
                      <>
                        <span><i className="fas fa-crosshairs me-2"></i>Tọa độ đã chọn</span>
                        <strong>{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</strong>
                      </>
                    ) : (
                      <>
                        <span><i className="fas fa-map-marker-alt me-2"></i>Chưa chọn vị trí</span>
                        <strong>Click trên bản đồ để ghim nơi nhận/trả.</strong>
                      </>
                    )}
                  </div>

                  {(errors.lat || errors.lng) && (
                    <div className="alert alert-warning py-2 px-3 small mt-3 mb-0" role="alert">
                      Vui lòng chọn vị trí trên bản đồ trước khi đăng vật phẩm.
                    </div>
                  )}

                  {locationError && (
                    <div className="alert alert-warning py-2 px-3 small mt-3 mb-0" role="alert">
                      {locationError}
                    </div>
                  )}
                </div>

                <div className="post-item-submit-panel">
                  <small className="text-muted">Các trường có dấu * là bắt buộc.</small>
                  <div className="d-grid gap-2 mt-3">
                    <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
                      {loading ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi' : 'Đăng vật phẩm')}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={loading || uploading}>
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default PostItemPage;
