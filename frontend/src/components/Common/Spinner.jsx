import React from 'react';
import './GlobalSpinner.css';

function Spinner() {
  return (
    <div className="global-spinner-overlay" role="status" aria-live="polite" aria-label="Đang tải">
      <div className="global-spinner-shell">
        <div className="global-spinner-ring" />
      </div>
    </div>
  );
}

export default Spinner;
