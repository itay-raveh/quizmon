import { siteHostname } from '@/app/site';

export const TrainerShareAttribution = () => (
  <footer className="trainer-share-attribution" hidden>
    <span>Play at</span>
    <strong>{siteHostname}</strong>
  </footer>
);
