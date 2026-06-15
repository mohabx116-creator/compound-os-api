import {
  AdminNotificationAudience,
  ComplaintStatus,
  ComplaintPriority,
  RentalBedStatus,
  RentalInquiryStatus,
  RentalListingStatus,
  RentalOwnerSubmissionStatus,
  RentalTenantStatus,
  ServiceItemKind,
  ServiceItemStatus,
  UnitStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import type { DashboardSummary } from './admin-dashboard.types.js';

const RECENT_LIMIT = 5;

export class AdminDashboardService {
  static async getSummary(compoundId: string): Promise<DashboardSummary> {
    // ── Run all counts in parallel via Promise.all for performance ─────────
    const [
      // Rental listing counts
      activeListings,
      // Bed counts (across all listings in compound)
      availableBeds,
      reservedBeds,
      rentedBeds,
      // Inquiry counts
      pendingInquiries,
      closedInquiries,
      cancelledInquiries,
      // Owner submission counts
      pendingOwnerSubmissions,
      approvedOwnerSubmissions,
      // Tenant + owner counts
      activeTenants,
      owners,
      // Service item counts
      totalServiceItems,
      publicFacilities,
      publicTechnical,
      inactiveServiceItems,
      featuredServiceItems,
      // Complaint counts
      totalComplaints,
      openComplaints,
      inProgressComplaints,
      resolvedComplaints,
      urgentComplaints,
      // Residents + units
      totalResidents,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      // Unread notifications
      unreadNotifications,
      // Recent lists
      recentInquiries,
      recentSubmissions,
      recentTenants,
      recentServiceItems,
      recentComplaints,
      recentNotifications,
    ] = await Promise.all([
      // ── Rentals ────────────────────────────────────────────────────────────
      prisma.rentalListing.count({
        where: {
          compoundId,
          status: {
            in: [
              RentalListingStatus.ACTIVE,
              RentalListingStatus.RESERVED,
            ],
          },
        },
      }),

      // Beds by status (across compound)
      prisma.rentalBed.count({
        where: {
          listing: { compoundId },
          status: RentalBedStatus.AVAILABLE,
        },
      }),
      prisma.rentalBed.count({
        where: {
          listing: { compoundId },
          status: RentalBedStatus.RESERVED,
        },
      }),
      prisma.rentalBed.count({
        where: {
          listing: { compoundId },
          status: RentalBedStatus.RENTED,
        },
      }),

      // Inquiries
      prisma.rentalInquiry.count({
        where: {
          compoundId,
          status: RentalInquiryStatus.NEW,
        },
      }),
      prisma.rentalInquiry.count({
        where: {
          compoundId,
          status: RentalInquiryStatus.CLOSED,
        },
      }),
      prisma.rentalInquiry.count({
        where: {
          compoundId,
          status: RentalInquiryStatus.CANCELLED,
        },
      }),

      // Owner submissions
      prisma.rentalOwnerSubmission.count({
        where: {
          compoundId,
          status: {
            in: [
              RentalOwnerSubmissionStatus.NEW,
              RentalOwnerSubmissionStatus.UNDER_REVIEW,
              RentalOwnerSubmissionStatus.NEEDS_CHANGES,
            ],
          },
        },
      }),
      prisma.rentalOwnerSubmission.count({
        where: {
          compoundId,
          status: {
            in: [
              RentalOwnerSubmissionStatus.APPROVED,
              RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING,
            ],
          },
        },
      }),

      // Tenants + owners
      prisma.rentalTenant.count({
        where: {
          compoundId,
          status: RentalTenantStatus.ACTIVE,
        },
      }),
      prisma.rentalOwner.count({
        where: { compoundId },
      }),

      // ── Services ───────────────────────────────────────────────────────────
      prisma.serviceItem.count({ where: { compoundId } }),
      prisma.serviceItem.count({
        where: {
          compoundId,
          kind: ServiceItemKind.FACILITY,
          isPublic: true,
          status: ServiceItemStatus.ACTIVE,
        },
      }),
      prisma.serviceItem.count({
        where: {
          compoundId,
          kind: ServiceItemKind.TECHNICAL,
          isPublic: true,
          status: ServiceItemStatus.ACTIVE,
        },
      }),
      prisma.serviceItem.count({
        where: {
          compoundId,
          status: ServiceItemStatus.INACTIVE,
        },
      }),
      prisma.serviceItem.count({
        where: {
          compoundId,
          isFeatured: true,
        },
      }),

      // ── Complaints ─────────────────────────────────────────────────────────
      prisma.complaint.count({ where: { compoundId } }),
      prisma.complaint.count({
        where: { compoundId, status: ComplaintStatus.OPEN },
      }),
      prisma.complaint.count({
        where: { compoundId, status: ComplaintStatus.IN_PROGRESS },
      }),
      prisma.complaint.count({
        where: {
          compoundId,
          status: {
            in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
          },
        },
      }),
      prisma.complaint.count({
        where: { compoundId, priority: ComplaintPriority.URGENT },
      }),

      // ── Residents / Units ──────────────────────────────────────────────────
      prisma.resident.count({ where: { compoundId } }),
      prisma.unit.count({ where: { compoundId } }),
      prisma.unit.count({ where: { compoundId, status: UnitStatus.OCCUPIED } }),
      prisma.unit.count({ where: { compoundId, status: UnitStatus.VACANT } }),

      // ── Notifications ──────────────────────────────────────────────────────
      prisma.adminNotification.count({
        where: {
          audience: AdminNotificationAudience.ADMIN,
          readAt: null,
          OR: [{ compoundId }, { compoundId: null }],
        },
      }),

      // ── Recent: Inquiries ──────────────────────────────────────────────────
      prisma.rentalInquiry.findMany({
        where: { compoundId, status: RentalInquiryStatus.NEW },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          status: true,
          tenantName: true,
          tenantPhone: true,
          createdAt: true,
          listing: {
            select: { title: true },
          },
        },
      }),

      // ── Recent: Owner Submissions ──────────────────────────────────────────
      prisma.rentalOwnerSubmission.findMany({
        where: {
          compoundId,
          status: {
            in: [
              RentalOwnerSubmissionStatus.NEW,
              RentalOwnerSubmissionStatus.UNDER_REVIEW,
              RentalOwnerSubmissionStatus.NEEDS_CHANGES,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          status: true,
          ownerName: true,
          ownerPhone: true,
          title: true,
          createdAt: true,
        },
      }),

      // ── Recent: Tenants ────────────────────────────────────────────────────
      // NOTE: nationalId is intentionally excluded from select
      prisma.rentalTenant.findMany({
        where: { compoundId, status: RentalTenantStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          createdAt: true,
          listing: {
            select: { title: true },
          },
        },
      }),

      // ── Recent: Service Items ──────────────────────────────────────────────
      prisma.serviceItem.findMany({
        where: { compoundId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          kind: true,
          title: true,
          status: true,
          isPublic: true,
          createdAt: true,
        },
      }),

      // ── Recent: Complaints ─────────────────────────────────────────────────
      prisma.complaint.findMany({
        where: { compoundId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),

      // ── Recent: Notifications ──────────────────────────────────────────────
      prisma.adminNotification.findMany({
        where: {
          audience: AdminNotificationAudience.ADMIN,
          readAt: null,
          OR: [{ compoundId }, { compoundId: null }],
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          id: true,
          title: true,
          entityType: true,
          targetUrl: true,
          readAt: true,
          createdAt: true,
        },
      }),
    ]);

    // ── Shape the response ─────────────────────────────────────────────────
    return {
      rentals: {
        activeListings,
        availableBeds,
        reservedBeds,
        rentedBeds,
        pendingInquiries,
        closedInquiries,
        cancelledInquiries,
        pendingOwnerSubmissions,
        approvedOwnerSubmissions,
        activeTenants,
        owners,
      },
      services: {
        totalItems: totalServiceItems,
        publicFacilities,
        publicTechnicalServices: publicTechnical,
        inactiveItems: inactiveServiceItems,
        featuredItems: featuredServiceItems,
      },
      complaints: {
        total: totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        resolved: resolvedComplaints,
        urgent: urgentComplaints,
      },
      residents: {
        totalResidents,
        totalUnits,
        occupiedUnits,
        vacantUnits,
      },
      notifications: {
        unread: unreadNotifications,
      },
      recent: {
        rentalInquiries: recentInquiries.map((inq) => ({
          id: inq.id,
          status: inq.status,
          tenantName: inq.tenantName,
          tenantPhone: inq.tenantPhone,
          listingTitle: inq.listing?.title ?? null,
          createdAt: inq.createdAt,
        })),
        ownerSubmissions: recentSubmissions.map((sub) => ({
          id: sub.id,
          status: sub.status,
          ownerName: sub.ownerName,
          ownerPhone: sub.ownerPhone,
          title: sub.title,
          createdAt: sub.createdAt,
        })),
        tenants: recentTenants.map((t) => ({
          id: t.id,
          fullName: t.fullName,
          phone: t.phone,
          status: t.status,
          listingTitle: t.listing?.title ?? null,
          createdAt: t.createdAt,
        })),
        serviceItems: recentServiceItems.map((si) => ({
          id: si.id,
          kind: si.kind,
          title: si.title,
          status: si.status,
          isPublic: si.isPublic,
          createdAt: si.createdAt,
        })),
        complaints: recentComplaints.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          priority: c.priority,
          createdAt: c.createdAt,
        })),
        notifications: recentNotifications.map((n) => ({
          id: n.id,
          title: n.title,
          entityType: n.entityType ?? null,
          targetUrl: n.targetUrl ?? null,
          isRead: n.readAt !== null,
          createdAt: n.createdAt,
        })),
      },
    };
  }
}
