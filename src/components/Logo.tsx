import { site } from '@/app/site';

export const Logo = () => (
  <img
    className="logo"
    src="/assets/images/logo.png"
    alt={`${site.name}: ${site.tagline}`}
  />
);
