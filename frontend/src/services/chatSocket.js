import { io } from 'socket.io-client';

const TOKEN_KEY = 'token';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

const getSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const createRentalChatSocket = () => io(getSocketUrl(), {
  autoConnect: false,
  auth: {
    token: getStoredToken(),
  },
  transports: ['websocket', 'polling'],
});
