-- Webhook and checkout-page confirmation can fulfil the same purchase at the
-- same moment. These unique indexes guarantee one site per order and one
-- subscription row per site, no matter how the race goes. The application
-- code treats a unique violation as "someone else already did it".
--
-- If this fails with "could not create unique index", you have duplicate test
-- rows: delete the extra customer_sites / subscriptions rows and re-run.

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_sites_order_id
  ON public.customer_sites (order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_site_id
  ON public.subscriptions (site_id) WHERE site_id IS NOT NULL;
