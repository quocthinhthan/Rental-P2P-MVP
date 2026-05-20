import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getItemStatusI18nKey, ItemStatus } from '../../constants/enums';
import { getItemCardImage } from '../../utils/cloudinaryImage';
import UserTrustSummary from '../Trust/TrustBadge';
import '../../styles/ItemCard.css';

function ItemCard({ item }) {
  const { t } = useTranslation();
  const imageUrl = item.mainImage || 'https://via.placeholder.com/300x300.png?text=No+Image';
  const imageSources = getItemCardImage(imageUrl);
  const statusKey = getItemStatusI18nKey(item.status);
  const isAvailable = item.status === ItemStatus.AVAILABLE;
  const rawDistance = item.distanceKm ?? item.distance;
  const distanceValue = Number(rawDistance);
  const hasDistance = rawDistance !== undefined && rawDistance !== null && rawDistance !== '' && Number.isFinite(distanceValue);
  const distanceLabel = hasDistance
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(distanceValue)
    : '';
  const priceValue = Number(item.pricePerDay);
  const hasValidPrice = Number.isFinite(priceValue);
  const priceLabel = hasValidPrice ? priceValue.toLocaleString('vi-VN') : 'Liên hệ';
  const owner = item.owner || item.ownerId;

  return (
    <div className="col-md-6 col-lg-4 col-xl-3 mb-4">
      <div
        className="product-item rounded h-100 shadow-sm transition"
        style={{ overflow: 'hidden', border: '1px solid #eee' }}
      >
        <div className="product-item-inner d-flex flex-column h-100">
          <div className="position-relative">
            <img
              src={imageSources.src}
              srcSet={imageSources.srcSet}
              sizes={imageSources.sizes}
              alt={item.name || t('common.placeholderImage')}
              className="img-fluid w-100"
              loading="lazy"
              decoding="async"
              style={{ height: '230px', objectFit: 'cover', backfaceVisibility: 'hidden' }}
            />

            <span className={`badge position-absolute top-0 start-0 m-2 ${isAvailable ? 'bg-success' : 'bg-secondary'}`}>
              {t(statusKey)}
            </span>

            <Link
              to={`/items/${item._id}`}
              className="position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
              aria-label={t('common.viewDetail')}
              style={{ width: 48, height: 48, opacity: 0, transition: '0.3s' }}
            >
              <i className="fa fa-eye"></i>
            </Link>
          </div>

          <div className="text-center p-3 d-flex flex-column flex-grow-1">
            <div className="flex-grow-1">
              <Link
                to={`/items/${item._id}`}
                className="d-block fw-semibold text-dark mb-2"
                style={{
                  textDecoration: 'none',
                  display: '-webkit-box',
                  WebkitLineClamp: '2',
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
                title={item.name}
              >
                {item.name}
              </Link>

              <div className="fw-bold text-primary">
                {hasValidPrice
                  ? t('common.currencyPerDay', { value: priceLabel })
                  : priceLabel}
              </div>

              {hasDistance && (
                <div className="small text-muted mt-2">
                  <i className="fas fa-location-dot text-primary me-1"></i>
                  Cách bạn {distanceLabel} km
                </div>
              )}

              {owner?.fullName && (
                <div className="item-card-owner-trust mt-3">
                  <img
                    src={owner.avatarUrl || 'https://via.placeholder.com/32'}
                    alt={owner.fullName}
                    className="item-card-owner-avatar"
                  />
                  <div className="item-card-owner-copy">
                    <span className="item-card-owner-name">{owner.fullName}</span>
                    <UserTrustSummary user={owner} compact />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-3">
              <Link
                to={`/items/${item._id}`}
                className="btn btn-primary rounded-pill px-4 py-2 w-100 shadow-sm"
              >
                {t('item.rentNow')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .product-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 15px rgba(0,0,0,0.15);
          }
          .product-item:hover img {
            filter: none;
          }
          .product-item:hover a.position-absolute {
            opacity: 1 !important;
          }
        `}
      </style>
    </div>
  );
}

export default ItemCard;
