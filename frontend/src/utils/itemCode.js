const normalizeCode = (value) => {
  if (!value) return '';
  return String(value).trim().toUpperCase();
};

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getLegacyCode = (value) => {
  const id = getId(value);
  return id ? id.slice(-6).toUpperCase() : '';
};

export const getEntityCode = (value) => (
  normalizeCode(typeof value === 'object' ? value?.code : '') || getLegacyCode(value)
);

export const formatEntityCode = (value) => {
  const code = getEntityCode(value);
  return code ? `#${code}` : '-';
};

export const getItemCode = getEntityCode;
export const formatItemCode = formatEntityCode;

export const getRentalCode = getEntityCode;
export const formatRentalCode = formatEntityCode;
