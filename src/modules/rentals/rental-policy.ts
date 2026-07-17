export const RENTAL_POLICY = {
  currency: 'EGP',
  ownerListingPublishingFee: 500,
  tenantContactUnlockFee: 100,
  reservationHoldFee: 1000,
  reservationHoldHours: 24,
  reservationPaymentLockMinutes: 10,
  platformCommissionRate: 10,
} as const;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculateRentalListingExpiryDate(adDate: Date): Date {
  const expiryDate = new Date(adDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  return expiryDate;
}
