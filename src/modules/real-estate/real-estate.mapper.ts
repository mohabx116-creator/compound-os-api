import { RealEstateListing } from '@prisma/client';

export const mapPublicListingDto = (listing: any) => {
  // Explicitly strip owner data and internal fields
  const {
    ownerName,
    ownerPhone,
    ownerWhatsapp,
    ownerEmail,
    internalNotes,
    buildingNumber,
    apartmentNumber,
    ...publicData
  } = listing;

  return publicData;
};

export const mapPublicListingsDto = (listings: any[]) => {
  return listings.map(mapPublicListingDto);
};
