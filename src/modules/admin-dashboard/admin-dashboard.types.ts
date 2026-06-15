// ── Dashboard Summary Response Types ──────────────────────────────────────────

export interface DashboardRentalInquiryItem {
  id: string;
  status: string;
  tenantName: string;
  tenantPhone: string;
  listingTitle: string | null;
  createdAt: Date;
}

export interface DashboardOwnerSubmissionItem {
  id: string;
  status: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  createdAt: Date;
}

export interface DashboardTenantItem {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  listingTitle: string | null;
  createdAt: Date;
}

export interface DashboardServiceItem {
  id: string;
  kind: string;
  title: string;
  status: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface DashboardComplaintItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: Date;
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  entityType: string | null;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface DashboardSummary {
  rentals: {
    activeListings: number;
    availableBeds: number;
    reservedBeds: number;
    rentedBeds: number;
    pendingInquiries: number;
    closedInquiries: number;
    cancelledInquiries: number;
    pendingOwnerSubmissions: number;
    approvedOwnerSubmissions: number;
    activeTenants: number;
    owners: number;
  };
  services: {
    totalItems: number;
    publicFacilities: number;
    publicTechnicalServices: number;
    inactiveItems: number;
    featuredItems: number;
  };
  complaints: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    urgent: number;
  };
  residents: {
    totalResidents: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
  };
  notifications: {
    unread: number;
  };
  recent: {
    rentalInquiries: DashboardRentalInquiryItem[];
    ownerSubmissions: DashboardOwnerSubmissionItem[];
    tenants: DashboardTenantItem[];
    serviceItems: DashboardServiceItem[];
    complaints: DashboardComplaintItem[];
    notifications: DashboardNotificationItem[];
  };
}
