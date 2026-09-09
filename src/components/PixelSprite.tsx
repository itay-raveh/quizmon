import type { ComponentProps } from 'react';

interface PixelSpriteProps extends Pick<
  ComponentProps<'img'>,
  'alt' | 'className' | 'fetchPriority' | 'style'
> {
  src: string;
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
