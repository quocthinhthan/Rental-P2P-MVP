const CLOUDINARY_UPLOAD_MARKER = '/upload/';
const CLOUDINARY_HOST_PATTERN = /res\.cloudinary\.com/i;

export const getCloudinaryImageUrl = (url, transformations = []) => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || !CLOUDINARY_HOST_PATTERN.test(url)) {
    return url;
  }

  const markerIndex = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (markerIndex === -1) {
    return url;
  }

  const normalizedTransformations = Array.isArray(transformations)
    ? transformations.filter(Boolean).join(',')
    : transformations;

  if (!normalizedTransformations) {
    return url;
  }

  const insertAt = markerIndex + CLOUDINARY_UPLOAD_MARKER.length;
  return `${url.slice(0, insertAt)}${normalizedTransformations}/${url.slice(insertAt)}`;
};

export const getCloudinarySrcSet = (url, widths, createTransformations) => {
  if (!url || !CLOUDINARY_HOST_PATTERN.test(url)) {
    return undefined;
  }

  return widths
    .map((width) => {
      const transformations = createTransformations(width);
      return `${getCloudinaryImageUrl(url, transformations)} ${width}w`;
    })
    .join(', ');
};

export const getItemCardImage = (url) => ({
  src: getCloudinaryImageUrl(url, ['f_auto', 'q_auto:best', 'c_fill', 'g_auto', 'w_720', 'h_540', 'dpr_auto']),
  srcSet: getCloudinarySrcSet(url, [360, 540, 720, 960], (width) => [
    'f_auto',
    'q_auto:best',
    'c_fill',
    'g_auto',
    `w_${width}`,
    `h_${Math.round(width * 0.75)}`,
  ]),
  sizes: '(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 25vw',
});

export const getDetailMainImage = (url) => ({
  src: getCloudinaryImageUrl(url, ['f_auto', 'q_auto:best', 'c_limit', 'w_1400', 'dpr_auto']),
  srcSet: getCloudinarySrcSet(url, [640, 960, 1200, 1400], (width) => [
    'f_auto',
    'q_auto:best',
    'c_limit',
    `w_${width}`,
  ]),
  sizes: '(max-width: 991px) 100vw, 50vw',
});

export const getDetailThumbImage = (url) => ({
  src: getCloudinaryImageUrl(url, ['f_auto', 'q_auto:best', 'c_fill', 'g_auto', 'w_180', 'h_180', 'dpr_auto']),
  srcSet: getCloudinarySrcSet(url, [120, 180, 240], (width) => [
    'f_auto',
    'q_auto:best',
    'c_fill',
    'g_auto',
    `w_${width}`,
    `h_${width}`,
  ]),
  sizes: '80px',
});

export const getRelatedItemImage = (url) => ({
  src: getCloudinaryImageUrl(url, ['f_auto', 'q_auto:best', 'c_fill', 'g_auto', 'w_640', 'h_430', 'dpr_auto']),
  srcSet: getCloudinarySrcSet(url, [320, 480, 640, 800], (width) => [
    'f_auto',
    'q_auto:best',
    'c_fill',
    'g_auto',
    `w_${width}`,
    `h_${Math.round(width * 0.67)}`,
  ]),
  sizes: '(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw',
});

export const getMiniItemImage = (url) => ({
  src: getCloudinaryImageUrl(url, ['f_auto', 'q_auto:best', 'c_fill', 'g_auto', 'w_420', 'h_320', 'dpr_auto']),
  srcSet: getCloudinarySrcSet(url, [240, 360, 480, 640], (width) => [
    'f_auto',
    'q_auto:best',
    'c_fill',
    'g_auto',
    `w_${width}`,
    `h_${Math.round(width * 0.76)}`,
  ]),
  sizes: '(max-width: 767px) 42vw, 16vw',
});
