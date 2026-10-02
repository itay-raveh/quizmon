import * as styles from './styles/classes.css.ts';
interface SpriteProps {
  silhouette: boolean;
  src: string | null;
}

export const Sprite = ({ silhouette, src }: SpriteProps) => {
  if (!src) {
    return <p>No image is available for this Pokémon.</p>;
  }

  const isSmoothArtwork =
    /\/other\/(?:dream-world|home|official-artwork)\//.test(src);
  const hasOpaqueCanvas =
    /\/versions\/generation-(?:i|ii)\//.test(src) &&
    !src.includes('/transparent/');
  const className = [
    styles.sprite,
    silhouette ? styles.spriteSilhouette : '',
    isSmoothArtwork ? styles.spriteSmooth : '',
    hasOpaqueCanvas ? styles.spriteOpaqueCanvas : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.spriteFrame}>
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
