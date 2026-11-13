import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border/60 bg-background/40">
      <div className="container-page py-16 grid gap-10 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center">
            {/* Desktop Logo */}
            <img
              src="/logo/hoonext-logo-desktop.png"
              alt="HooNext"
              className="hidden md:block h-10 w-auto object-contain"
            />

            {/* Mobile Logo */}
            <img
              src="/logo/hoonext-logo-mobile.png"
              alt="HooNext"
              className="block md:hidden h-10 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            The marketplace for premium business websites. Own your site or subscribe monthly.
          </p>
        </div>
        <FooterCol title="Product" links={[
          ["Marketplace", "/marketplace"],
          ["Pricing", "/pricing"],
          ["How it works", "/#how-it-works"],
          ["FAQ", "/faq"],
        ]} />
        <FooterCol title="Company" links={[
          ["About", "/about"],
          ["Contact", "/contact"],
          ["Support", "/support"],
        ]} />
        <FooterCol title="Legal" links={[
          ["Privacy Policy", "/privacy"],
          ["Terms & Conditions", "/terms"],
          ["Refund Policy", "/refund-policy"],
          ["Cookie Policy", "/cookie-policy"],
        ]} />
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-6 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} HooNext. All rights reserved.</span>
          <span>Crafted for modern businesses.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link to={href} className="hover:text-foreground transition-colors">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
