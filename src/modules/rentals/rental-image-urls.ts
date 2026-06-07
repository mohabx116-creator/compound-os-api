const CLOUDINARY_UPLOAD_MARKER = '/upload/';

export interface OptimizedRentalImageUrls {
  card: string;
  hero: string;
  thumbnail: string;
}

function cloudinaryTransformUrl(url: string, transform: string) {
  if (!url.includes('res.cloudinary.com') || !url.includes(CLOUDINARY_UPLOAD_MARKER)) {
    return url;
  }

  const [prefix, suffix] = url.split(CLOUDINARY_UPLOAD_MARKER);
  if (!prefix || !suffix) {
    return url;
  }

  return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${transform}/${suffix}`;
}

export function getOptimizedRentalImageUrls(url: string): OptimizedRentalImageUrls {
  return {
    card: cloudinaryTransformUrl(url, 'f_auto,q_auto,w_600,c_limit'),
    hero: cloudinaryTransformUrl(url, 'f_auto,q_auto,w_1200,c_limit'),
    thumbnail: cloudinaryTransformUrl(url, 'f_auto,q_auto,w_300,c_limit'),
  };
}

export function withOptimizedRentalImages<T extends { images?: Array<{ url: string }> }>(
  listing: T,
) {
  return {
    ...listing,
    images: listing.images?.map((image) => ({
      ...image,
      optimizedUrls: getOptimizedRentalImageUrls(image.url),
    })),
  };
}
