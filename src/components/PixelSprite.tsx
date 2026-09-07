interface PixelSpriteProps {
  src: string;
  className?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const PixelSprite = ({
  src,
  className = '',
  fetchPriority = 'high',
}: PixelSpriteProps) => (
  <img
    className={`pixel-sprite ${className}`.trim()}
    src={src}
    alt=""
    decoding="async"
    fetchPriority={fetchPriority}
    width="96"
    height="96"
  />
);
