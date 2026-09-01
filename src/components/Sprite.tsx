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

  return (
    <div className="sprite-frame">
      <img
        className={`sprite ${silhouette ? 'sprite--silhouette' : ''}`}
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
