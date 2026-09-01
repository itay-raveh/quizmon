import type { SpriteData } from '@/game/sprite';

interface SpriteProps {
  silhouette: boolean;
  sprite: SpriteData | null;
}

export const Sprite = ({ silhouette, sprite }: SpriteProps) => {
  if (!sprite) {
    return (
      <p className="sprite-error">No image is available for this Pokémon.</p>
    );
  }

  return (
    <div className="sprite-frame">
      <img
        className={`sprite ${silhouette ? 'sprite--silhouette' : ''}`}
        src={sprite.src}
        alt={silhouette ? 'Mystery Pokémon silhouette' : 'Pokémon to identify'}
        width="300"
        height="300"
        style={{ imageRendering: sprite.rendering }}
      />
    </div>
  );
};
