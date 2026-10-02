import trophy from '@/assets/images/trophy.png';

export const Trophy = ({ className = '' }: { className?: string }) => (
  <img
    className={`trophy ${className}`.trim()}
    src={trophy}
    alt=""
    aria-hidden="true"
    width="64"
    height="64"
  />
);
