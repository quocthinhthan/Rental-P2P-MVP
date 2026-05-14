import React, { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import apiService from '../../services/api';
import 'leaflet/dist/leaflet.css';
import './LocationPickerModal.css';

const DEFAULT_LOCATION = {
  lat: 10.7769,
  lng: 106.7009,
};

const RADIUS_OPTIONS = ['1', '3', '5', '10', '20', '50'];

function MapCenterTracker({ onCenterChange }) {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange({
        lat: center.lat,
        lng: center.lng,
      });
    },
  });

  return null;
}

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.6,
    });
  }, [center, map]);

  return null;
}

function MapReadyFix() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function LocationPickerModal({
  show,
  initialLocation,
  initialRadius = '5',
  itemFilters = {},
  onClose,
  onConfirm,
}) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || DEFAULT_LOCATION);
  const [mapCenter, setMapCenter] = useState(initialLocation || DEFAULT_LOCATION);
  const [selectedRadius, setSelectedRadius] = useState(String(initialRadius || '5'));
  const [mapItems, setMapItems] = useState([]);
  const [mapItemsLoading, setMapItemsLoading] = useState(false);
  const [mapItemsError, setMapItemsError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (!show) return;

    const nextLocation = initialLocation || DEFAULT_LOCATION;
    setSelectedLocation(nextLocation);
    setMapCenter(nextLocation);
    setSelectedRadius(String(initialRadius || '5'));
    setMapItemsError('');
    setGeoError('');
  }, [show, initialLocation, initialRadius]);

  useEffect(() => {
    if (!show || !selectedLocation) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setMapItemsLoading(true);
      setMapItemsError('');

      try {
        const response = await apiService.getNearbyMapItems({
          ...itemFilters,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: selectedRadius,
        });

        if (!cancelled) {
          setMapItems(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setMapItems([]);
          setMapItemsError('Chưa tải được vị trí vật phẩm trên bản đồ.');
          console.error('Lỗi khi tải marker vật phẩm:', error);
        }
      } finally {
        if (!cancelled) {
          setMapItemsLoading(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [show, selectedLocation, selectedRadius, itemFilters]);

  useEffect(() => {
    if (!show) return undefined;

    document.body.classList.add('modal-open');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = previousOverflow;
    };
  }, [show]);

  const visibleMapItems = useMemo(
    () => mapItems.filter((item) => (
      item.mapLocation &&
      Number.isFinite(Number(item.mapLocation.lat)) &&
      Number.isFinite(Number(item.mapLocation.lng))
    )),
    [mapItems]
  );

  const handleUseCurrentLocation = () => {
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Trình duyệt của bạn chưa hỗ trợ lấy vị trí hiện tại.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setSelectedLocation(nextLocation);
        setMapCenter(nextLocation);
        setGeoLoading(false);
      },
      () => {
        setGeoError('Không thể lấy vị trí hiện tại. Vui lòng cho phép truy cập vị trí hoặc chọn trực tiếp trên bản đồ.');
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleConfirm = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    onConfirm({
      location: selectedLocation,
      radius: selectedRadius,
    });
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show location-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
        tabIndex="-1"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content location-picker-content">
            <div className="modal-header border-0 pb-0">
              <div>
                <h5 className="modal-title fw-bold" id="location-picker-title">
                  Bạn muốn thuê đồ ở đâu?
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Đóng"
                onClick={onClose}
              />
            </div>

            <div className="modal-body pt-3">
              <div className="row g-3 align-items-end mb-3">
                <div className="col-lg-7">
                  <label className="form-label fw-semibold">Tìm kiếm địa điểm</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="fas fa-search text-primary"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập địa điểm (sẽ tích hợp sau)"
                      disabled
                    />
                  </div>
                </div>

                <div className="col-sm-6 col-lg-2">
                  <label className="form-label fw-semibold">Bán kính</label>
                  <select
                    className="form-select"
                    value={selectedRadius}
                    onChange={(event) => setSelectedRadius(event.target.value)}
                  >
                    {RADIUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option} km
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-sm-6 col-lg-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary rounded-pill w-100"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                  >
                    {geoLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Đang lấy vị trí...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-location-crosshairs me-2"></i>
                        Dùng vị trí hiện tại
                      </>
                    )}
                  </button>
                </div>
              </div>

              {geoError && (
                <div className="alert alert-warning py-2 px-3 small mb-3" role="alert">
                  {geoError}
                </div>
              )}

              <div className="location-picker-map-wrap">
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={14}
                  minZoom={5}
                  maxZoom={18}
                  scrollWheelZoom
                  className="location-picker-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Circle
                    center={[selectedLocation.lat, selectedLocation.lng]}
                    radius={Number(selectedRadius) * 1000}
                    pathOptions={{
                      color: '#0d6efd',
                      fillColor: '#0d6efd',
                      fillOpacity: 0.07,
                      weight: 1,
                    }}
                  />
                  {visibleMapItems.map((item) => (
                    <CircleMarker
                      key={item._id}
                      center={[item.mapLocation.lat, item.mapLocation.lng]}
                      radius={8}
                      pathOptions={{
                        color: '#ffffff',
                        fillColor: '#f28b00',
                        fillOpacity: 1,
                        weight: 3,
                      }}
                    >
                      <Popup>
                        <div className="location-picker-popup">
                          <div className="fw-semibold">{item.name}</div>
                          {item.distance !== null && item.distance !== undefined && (
                            <div className="small text-muted">Cách vị trí chọn {item.distance} km</div>
                          )}
                          {item.pricePerDay && (
                            <div className="small text-primary fw-semibold">
                              {Number(item.pricePerDay).toLocaleString('vi-VN')} đ/ngày
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                  <MapReadyFix />
                  <MapRecenter center={mapCenter} />
                  <MapCenterTracker onCenterChange={setSelectedLocation} />
                </MapContainer>

                <div className="location-picker-center-pin" aria-hidden="true">
                  <i className="fas fa-map-marker-alt"></i>
                </div>

                <div className="location-picker-floating-card shadow">
                  <div className="text-muted small">Vị trí đã chọn</div>
                  <div className="fw-semibold text-dark">Khu vực đã chọn</div>
                  <div className="small text-muted">Tìm trong bán kính {selectedRadius} km</div>
                  <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                    <span className="badge bg-primary">Bán kính: {selectedRadius} km</span>
                    <span className="location-picker-item-count">
                      {mapItemsLoading ? 'Đang tải...' : `${visibleMapItems.length} vật phẩm`}
                    </span>
                  </div>
                  {mapItemsError && (
                    <div className="small text-warning mt-2">{mapItemsError}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>
                Đóng
              </button>
              <button type="button" className="btn btn-primary rounded-pill px-4" onClick={handleConfirm}>
                <i className="fas fa-search-location me-2"></i>
                Tìm đồ quanh vị trí này
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show location-picker-backdrop"></div>
    </>
  );
}

export default LocationPickerModal;
