import axios from 'axios';
import { startGlobalLoading, stopGlobalLoading } from '../contexts/LoadingContext';

const TOKEN_KEY = 'token';
const getStoredToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
export const ITEM_SEARCH_LIMIT = 20;
export const ITEM_MAP_SEARCH_LIMIT = 50;
const MAX_SEARCH_TEXT_LENGTH = 80;

const trimSearchText = (value) => (
  typeof value === 'string' ? value.trim().slice(0, MAX_SEARCH_TEXT_LENGTH) : value
);

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (!config.skipGlobalLoading) {
      startGlobalLoading();
    }

    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    stopGlobalLoading();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (!response.config.skipGlobalLoading) {
      stopGlobalLoading();
    }
    return response;
  },
  (error) => {
    if (!error.config?.skipGlobalLoading) {
      stopGlobalLoading();
    }
    return Promise.reject(error);
  }
);

// === Auth ===
export const login = (email, password) => api.post('/auth/login', { email, password });

export const register = (fullName, email, password, phoneNumber) =>
  api.post('/auth/register', { fullName, email, password, phoneNumber });

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

export const resetPassword = (token, password) => api.put(`/auth/reset-password/${token}`, { password });

export const updateProfile = (payload) => api.put('/auth/profile', payload);

export const verifyEKYC = (idCardFrontUrl) => api.post('/auth/verify-ekyc', { idCardFrontUrl });

// === Items ===
export const getItems = (params = {}) => {
  if (typeof params === 'string') {
    const queryString = buildItemsQueryString({
      search: trimSearchText(params),
      limit: ITEM_SEARCH_LIMIT,
    });
    return api.get(`/items?${queryString}`);
  }

  const queryString = buildItemsQueryString({
    ...params,
    limit: ITEM_SEARCH_LIMIT,
  });
  return api.get(`/items${queryString ? `?${queryString}` : ''}`);
};

const buildItemsQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.keys(params).forEach((key) => {
    const value = ['search', 'category', 'address'].includes(key)
      ? trimSearchText(params[key])
      : params[key];

    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  return query.toString();
};

export const getNearbyMapItems = (params = {}) => {
  const queryString = buildItemsQueryString({
    ...params,
    limit: ITEM_MAP_SEARCH_LIMIT,
    includeMapLocation: true,
  });

  return api.get(`/items${queryString ? `?${queryString}` : ''}`, {
    skipGlobalLoading: true,
  });
};

export const getCategories = () => api.get('/items/categories');
export const getBestsellers = (limit = 3) => api.get(`/items/bestsellers?limit=${limit}`);

export const createItem = (itemData) => api.post('/items', itemData);

export const updateItem = (itemId, itemData) => api.put(`/items/${itemId}`, itemData);

export const deleteItem = (itemId) => api.delete(`/items/${itemId}`);

export const suggestItemPrice = (payload) => api.post('/items/suggest-price', payload, {
  skipGlobalLoading: true,
});

// === Views (BFF) ===
export const getItemDetails = (itemId) => api.get(`/views/item-details/${itemId}`);

export const getMyRentals = () => api.get('/views/my-rentals');

// === Reviews ===
export const createReview = ({ rentalId, rating, comment }) =>
  api.post('/reviews', { rentalId, rating, comment });

export const getUserReviews = (userId, page = 1, limit = 5) =>
  api.get(`/reviews/users/${userId}?page=${page}&limit=${limit}`);

// === Rentals (Actions) ===
export const createRentalRequest = (itemId, startDate, endDate, note) =>
  api.post('/rentals', { itemId, startDate, endDate, note });

export const createVNPayUrl = (rentalId) => api.post(`/rentals/${rentalId}/create-vnpay-url`);

export const confirmRental = (rentalId) => api.patch(`/rentals/${rentalId}/confirm`);

export const rejectRental = (rentalId) => api.patch(`/rentals/${rentalId}/reject`);

export const getRentalContract = (rentalId) => api.get(`/rentals/${rentalId}/contract`);

export const signContract = (rentalId, signatureUrl) =>
  api.post(`/rentals/${rentalId}/sign-contract`, { signatureUrl });

export const pickupRental = (rentalId, pickupImages) =>
  api.patch(`/rentals/${rentalId}/pickup`, { pickupImages });

export const completeRental = (rentalId, returnImages) =>
  api.patch(`/rentals/${rentalId}/complete`, { returnImages });

export const getMe = () => api.get('/auth/me');

// === Upload ===
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadImages = async (files = []) => {
  const uploadResults = await Promise.all(files.map((file) => uploadImage(file)));
  return uploadResults.map((response) => response.data.imageUrl);
};

export const getAllDisputes = async (status) => {
  const response = await api.get(status && status !== 'all' ? `/disputes?status=${status}` : '/disputes');
  return response.data;
};

export const resolveDispute = async (id, resolveData) => {
  const response = await api.patch(`/disputes/${id}/resolve`, resolveData);
  return response.data;
};

export const createDispute = (rentalId, reason, evidenceImages = []) =>
  api.post('/disputes', { rentalId, reason, evidenceImages });

export const withdrawDispute = (id) => api.patch(`/disputes/${id}/withdraw`);

export const escalateDispute = (id) => api.patch(`/disputes/${id}/escalate`);

export const deleteImage = (publicId) => api.post('/upload/delete', { publicId });

const apiService = {
  login,
  register,
  forgotPassword,
  resetPassword,
  updateProfile,
  verifyEKYC,
  uploadImage,
  deleteImage,
  getMe,
  getItems,
  getNearbyMapItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  suggestItemPrice,
  getItemDetails,
  getMyRentals,
  createReview,
  getUserReviews,
  createRentalRequest,
  createVNPayUrl,
  confirmRental,
  rejectRental,
  getRentalContract,
  signContract,
  pickupRental,
  completeRental,
  createDispute,
  withdrawDispute,
  escalateDispute,
  getAllDisputes,
  resolveDispute,
  getBestsellers,
  uploadImages,
};

export default apiService;
export { api };
