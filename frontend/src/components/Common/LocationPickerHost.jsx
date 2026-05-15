import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LocationPickerModal from './LocationPickerModal';

const parseLocationFromParams = (params) => {
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

function LocationPickerHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const [modalConfig, setModalConfig] = useState(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const defaultConfig = useMemo(() => {
    const initialLocation = parseLocationFromParams(searchParams);
    const initialRadius = searchParams.get('radius') || undefined;
    const itemFilters = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      address: searchParams.get('address') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      ownerId: searchParams.get('ownerId') || '',
    };

    return {
      initialLocation,
      initialRadius,
      itemFilters,
    };
  }, [searchParams]);

  useEffect(() => {
    const openLocationPicker = (event) => {
      setModalConfig({
        ...defaultConfig,
        ...(event.detail || {}),
      });
    };

    window.addEventListener('rentalp2p:open-location-picker', openLocationPicker);

    if (sessionStorage.getItem('rentalp2p:open-location-picker') === '1') {
      sessionStorage.removeItem('rentalp2p:open-location-picker');
      openLocationPicker({ detail: {} });
    }

    return () => {
      window.removeEventListener('rentalp2p:open-location-picker', openLocationPicker);
    };
  }, [defaultConfig]);

  const handleClose = useCallback(() => {
    setModalConfig(null);
  }, []);

  const handleConfirm = useCallback(({ location: selectedLocation, radius }) => {
    if (typeof modalConfig?.onConfirm === 'function') {
      modalConfig.onConfirm({ location: selectedLocation, radius });
      setModalConfig(null);
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set('lat', selectedLocation.lat);
    params.set('lng', selectedLocation.lng);
    if (radius) params.set('radius', radius);
    navigate(`/shop?${params.toString()}`);
    setModalConfig(null);
  }, [location.search, modalConfig, navigate]);

  const handleItemSelect = useCallback((item) => {
    if (!item?._id) return;

    setModalConfig(null);
    navigate(`/items/${item._id}`);
  }, [navigate]);

  if (!modalConfig) return null;

  return (
    <LocationPickerModal
      show
      initialLocation={modalConfig.initialLocation}
      initialRadius={modalConfig.initialRadius}
      itemFilters={modalConfig.itemFilters}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onItemSelect={handleItemSelect}
      preferCurrentLocation={modalConfig.preferCurrentLocation}
    />
  );
}

export default LocationPickerHost;
