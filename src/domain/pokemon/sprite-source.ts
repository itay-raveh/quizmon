export const SPRITE_SOURCE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master';

const SPRITE_PATH =
  /^\/sprites\/pokemon\/(?:(?:back\/|shiny\/)?[1-9]\d{0,5}(?:-[a-z0-9]+)*\.png|other\/(?:(?:home|official-artwork)\/[1-9]\d{0,5}(?:-[a-z0-9]+)*\.png|dream-world\/[1-9]\d{0,5}(?:-[a-z0-9]+)*\.svg|showdown\/(?:back\/)?[1-9]\d{0,5}(?:-[a-z0-9]+)*\.gif))$/;
const VERSION_SPRITE_PATH = new RegExp(
  '^/sprites/pokemon/versions/generation-(?:' +
    [
      'i/(?:red-blue|yellow)',
      'ii/(?:crystal|gold|silver)',
      'iii/(?:emerald|firered-leafgreen|ruby-sapphire)',
      'iv/(?:diamond-pearl|heartgold-soulsilver|platinum)',
      'v/black-white',
      'vi/(?:omegaruby-alphasapphire|x-y)',
      'vii/ultra-sun-ultra-moon',
      'viii/brilliant-diamond-shining-pearl',
      'ix/scarlet-violet',
    ].join('|') +
    ')/(?:back/)?[1-9]\\d{0,5}(?:-[a-z0-9]+)*\\.png$',
);

export const isSpritePath = (path: string): boolean =>
  SPRITE_PATH.test(path) || VERSION_SPRITE_PATH.test(path);

export const normalizeSpriteUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (!url.startsWith(`${SPRITE_SOURCE}/sprites/`)) {
    throw new Error(`Unexpected PokéAPI sprite URL: ${url}`);
  }
  return url.slice(SPRITE_SOURCE.length);
};

export const fetchSpriteSource = (path: string, options?: RequestInit) => {
  if (!isSpritePath(path)) throw new Error(`Unexpected sprite path: ${path}`);
  return fetch(`${SPRITE_SOURCE}${path}`, options);
};
