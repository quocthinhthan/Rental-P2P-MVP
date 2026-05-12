import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LoadingContext = createContext({
  isLoading: false,
  showLoading: () => {},
  hideLoading: () => {},
  setLoading: () => {},
});

let externalShowLoading = () => {};
let externalHideLoading = () => {};

export const startGlobalLoading = () => externalShowLoading();
export const stopGlobalLoading = () => externalHideLoading();

export function LoadingProvider({ children }) {
  const [requestCount, setRequestCount] = useState(0);

  const showLoading = useCallback(() => {
    setRequestCount((currentCount) => currentCount + 1);
  }, []);

  const hideLoading = useCallback(() => {
    setRequestCount((currentCount) => Math.max(0, currentCount - 1));
  }, []);

  const setLoading = useCallback((nextLoadingState) => {
    setRequestCount(nextLoadingState ? 1 : 0);
  }, []);

  externalShowLoading = showLoading;
  externalHideLoading = hideLoading;

  const value = useMemo(
    () => ({
      isLoading: requestCount > 0,
      showLoading,
      hideLoading,
      setLoading,
    }),
    [hideLoading, requestCount, setLoading, showLoading]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  return useContext(LoadingContext);
}
