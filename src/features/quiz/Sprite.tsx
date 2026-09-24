interface SpriteProps {
  silhouette: boolean;
  src: string | null;
}

export const Sprite = ({ silhouette, src }: SpriteProps) => {
  if (!src) {
    return (
      <p className="sprite-error">No image is available for this Pokémon.</p>
    );
  }

  const isSmoothArtwork =
    /\/other\/(?:dream-world|home|official-artwork)\//.test(src);
  const hasOpaqueCanvas =
    /\/versions\/generation-(?:i|ii)\//.test(src) &&
    !src.includes('/transparent/');
  const className = [
    'sprite',
    silhouette ? 'sprite--silhouette' : '',
    isSmoothArtwork ? 'sprite--smooth' : '',
    hasOpaqueCanvas ? 'sprite--opaque-canvas' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="sprite-frame">
      <img
        className={className}
        src={src}
        alt={silhouette ? 'Mystery Pokémon silhouette' : 'Pokémon to identify'}
        decoding="async"
        fetchPriority="high"
        width="96"
        height="96"
      />
    </div>
  );
};
