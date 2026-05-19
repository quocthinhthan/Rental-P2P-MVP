import React from 'react';
import AdminNav from './AdminNav';
import '../../styles/AdminHero.css';

export default function AdminHero({
  eyebrow,
  title,
  description,
  actions = null,
  showNav = true,
  className = '',
}) {
  return (
    <section className={`admin-disputes-hero admin-hero ${className}`.trim()}>
      <div className="admin-disputes-hero-copy admin-hero-copy">
        {eyebrow && <span className="admin-disputes-eyebrow admin-hero-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(showNav || actions) && (
        <div className="admin-hero-actions">
          {showNav && <AdminNav />}
          {actions}
        </div>
      )}
    </section>
  );
}
