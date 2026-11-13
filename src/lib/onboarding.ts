// Shared by the customize, review and checkout steps. Lives outside the route
// files on purpose: importing from a route module drags that whole page into
// every bundle that uses it.

export const ONBOARDING_KEY = (slug: string) => `hoonext_onboarding_${slug}`;

export interface OnboardingData {
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  services: string;
  about: string;
  logo_data_url?: string;
  gallery_urls: string;
  brand_colors: string;
  social_links: string;
  existing_domain: string;
  change_requests: string;
  submitted_at: string;
}

export function readOnboarding(slug: string): Record<string, unknown> | undefined {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_KEY(slug));
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}
