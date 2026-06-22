ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_owner_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_submission_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.admin_notifications FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_inquiries FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_listing_images FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_listings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_owner_submissions FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_submission_images FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.rental_beds FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.rental_tenants FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.service_items FROM anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.admin_notifications FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_inquiries FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_listing_images FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_listings FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_owner_submissions FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.real_estate_submission_images FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.rental_beds FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.rental_tenants FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.service_items FROM PUBLIC;
