import { site } from '@/app/site';
import logo496Avif from '@/assets/images/logo-496.avif';
import logo496Webp from '@/assets/images/logo-496.webp';
import logo992Avif from '@/assets/images/logo-992.avif';
import logo992Webp from '@/assets/images/logo-992.webp';
import wordmark from '@/assets/images/wordmark.png';

export const Logo = () => (
  <picture className="logo-picture">
    <source
      sizes="(max-width: 58.8rem) 20rem, (max-width: 91rem) 34vw, 31rem"
      srcSet={`${logo496Avif} 496w, ${logo992Avif} 992w`}
      type="image/avif"
    />
    <source
      sizes="(max-width: 58.8rem) 20rem, (max-width: 91rem) 34vw, 31rem"
      srcSet={`${logo496Webp} 496w, ${logo992Webp} 992w`}
      type="image/webp"
    />
    <img
      className="logo"
      src={wordmark}
      alt={`${site.name}: ${site.tagline}`}
      fetchPriority="high"
      height="456"
      width="992"
    />
  </picture>
);
