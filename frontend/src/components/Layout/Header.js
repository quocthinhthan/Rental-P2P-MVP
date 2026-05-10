import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="container-fluid px-5 d-none border-bottom d-lg-block">
        <div className="row gx-0 align-items-center">
          <div className="col-lg-4 text-center text-lg-start mb-lg-0">
            <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
              <span className="text-muted me-2">{t('navbar.help')}</span>
              <small> / </small>
              <span className="text-muted mx-2">{t('navbar.support')}</span>
              <small> / </small>
              <span className="text-muted ms-2">{t('navbar.contact')}</span>
            </div>
          </div>

          <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
            <small className="text-dark">{t('navbar.callUs')}</small>
            <span className="text-muted ms-2">(+012) 1234 567890</span>
          </div>

          <div className="col-lg-4 text-center text-lg-end">
            <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
              <div className="dropdown">
                <button
                  type="button"
                  className="dropdown-toggle text-muted ms-2 btn btn-link p-0 border-0 text-decoration-none"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <small>
                    <i className="fa fa-user me-2"></i>
                    {isLoggedIn && user ? user.fullName : t('navbar.myAccount')}
                  </small>
                </button>

                <div className="dropdown-menu rounded">
                  {isLoggedIn && user ? (
                    <>
                      <span className="dropdown-item-text">
                        {t('navbar.helloUser', { name: user.fullName })}
                      </span>
                      <hr className="dropdown-divider" />
                      <Link to="/my-rentals" className="dropdown-item">
                        {t('navbar.myRentals')}
                      </Link>
                      <Link to="/post-item" className="dropdown-item">
                        {t('navbar.postNewItem')}
                      </Link>
                      <hr className="dropdown-divider" />
                      <button onClick={handleLogout} className="dropdown-item">
                        {t('navbar.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="dropdown-item">
                        {t('navbar.login')}
                      </Link>
                      <Link to="/register" className="dropdown-item">
                        {t('navbar.register')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid px-5 py-4 d-none d-lg-block">
        <div className="row gx-0 align-items-center text-center">
          <div className="col-md-4 col-lg-3 text-center text-lg-start">
            <div className="d-inline-flex align-items-center">
              <Link to="/" className="navbar-brand p-0">
                <h1 className="display-5 text-primary m-0">
                  <i className="fas fa-sync-alt text-secondary me-2"></i>
                  {t('common.appName')}
                </h1>
              </Link>
            </div>
          </div>
          <div className="col-md-4 col-lg-6 text-center"></div>
          <div className="col-md-4 col-lg-3 text-center text-lg-end"></div>
        </div>
      </div>

      <div className="container-fluid nav-bar p-0">
        <div className="row gx-0 bg-primary px-5 align-items-center">
          <div className="col-lg-3 d-none d-lg-block">
            <nav className="navbar navbar-light position-relative" style={{ width: '250px' }}>
              <button
                className="navbar-toggler border-0 fs-4 w-100 px-0 text-start"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#allCat"
              >
                <h4 className="m-0">
                  <i className="fa fa-bars me-2"></i>
                  {t('navbar.allCategories')}
                </h4>
              </button>

              <div className="collapse navbar-collapse rounded-bottom" id="allCat">
                <div className="navbar-nav ms-auto py-0">
                  <ul className="list-unstyled categories-bars">
                    <li>
                      <div className="categories-bars-item">
                        <span className="text-dark">{t('category.electronics')}</span>
                        <span>(0)</span>
                      </div>
                    </li>
                    <li>
                      <div className="categories-bars-item">
                        <span className="text-dark">{t('category.household')}</span>
                        <span>(0)</span>
                      </div>
                    </li>
                    <li>
                      <div className="categories-bars-item">
                        <span className="text-dark">{t('category.camping')}</span>
                        <span>(0)</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
          </div>

          <div className="col-12 col-lg-9">
            <nav className="navbar navbar-expand-lg navbar-light bg-primary">
              <Link to="/" className="navbar-brand d-block d-lg-none">
                <h1 className="display-5 text-secondary m-0">
                  <i className="fas fa-sync-alt text-white me-2"></i>
                  {t('common.appName')}
                </h1>
              </Link>

              <button
                className="navbar-toggler ms-auto"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarCollapse"
              >
                <span className="fa fa-bars fa-1x"></span>
              </button>

              <div className="collapse navbar-collapse" id="navbarCollapse">
                <div className="navbar-nav ms-auto py-0">
                  <Link to="/" className="nav-item nav-link">
                    {t('navbar.home')}
                  </Link>
                  <Link to="/shop" className="nav-item nav-link">
                    {t('navbar.shop')}
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
