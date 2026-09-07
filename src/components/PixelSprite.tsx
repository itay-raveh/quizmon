import type { CSSProperties } from 'react';

interface PixelSpriteProps {
  src: string;
  alt?: string;
  style?: CSSProperties;
  className?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const PixelSprite = ({
  src,
  alt = '',
  style,
  className = '',
  fetchPriority = 'high',
}: PixelSpriteProps) => (
  <img
    className={`pixel-sprite ${className}`.trim()}
    src={src}
    alt={alt}
    style={style}
    decoding="async"
    fetchPriority={fetchPriority}
    width="96"
    height="96"
  />
);
