import React from 'react';
import { useLoading } from '../../contexts/LoadingContext';
import './GlobalSpinner.css';

function GlobalSpinner() {
  const { isLoading } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="global-spinner-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="global-spinner-shell">
        <div className="global-spinner-ring" />
      </div>
    </div>
  );
}

export default GlobalSpinner;
