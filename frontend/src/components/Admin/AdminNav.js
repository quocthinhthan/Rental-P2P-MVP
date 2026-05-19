import React from 'react';
import { NavLink } from 'react-router-dom';

export default function AdminNav() {
  const links = [
    { to: '/admin/dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
    { to: '/admin/items', icon: 'fas fa-boxes-stacked', label: 'Sản phẩm' },
    { to: '/admin/item-reports', icon: 'fas fa-flag', label: 'Report sản phẩm' },
    { to: '/admin/disputes', icon: 'fas fa-gavel', label: 'Tranh chấp' },
  ];

  return (
    <nav className="admin-section-nav" aria-label="Admin navigation">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `admin-section-nav-link${isActive ? ' is-active' : ''}`}
        >
          <i className={link.icon}></i>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
