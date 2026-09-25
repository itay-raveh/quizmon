import avatars from './data/trainer-avatars.json' with { type: 'json' };

const avatarIds = Object.keys(avatars);
const trainerAvatarIds = new Set<string>(avatarIds);
const trainerAvatarBases = new Set(avatarIds.map((id) => id.split('-')[0]));

const compoundNames: Record<string, string> = {
  acetrainer: 'Ace Trainer',
  acetrainercouple: 'Ace Trainer Couple',
  acetrainersnow: 'Ace Trainer (Snow)',
  acetrainersnowf: 'Ace Trainer (Snow, Female)',
  aromalady: 'Aroma Lady',
  battlegirl: 'Battle Girl',
  birdkeeper: 'Bird Keeper',
  blackbelt: 'Black Belt',
  brycenman: 'Brycen-Man',
  bugcatcher: 'Bug Catcher',
  bugmaniac: 'Bug Maniac',
  cameraman: 'Camera Man',
  crasherwake: 'Crasher Wake',
  crushgirl: 'Crush Girl',
  cueball: 'Cue Ball',
  depotagent: 'Depot Agent',
  doubleteam: 'Double Team',
  dragontamer: 'Dragon Tamer',
  firebreather: 'Firebreather',
  galacticgrunt: 'Galactic Grunt',
  hexmaniac: 'Hex Maniac',
  jessiejames: 'Jessie & James',
  jrtrainer: 'Jr. Trainer',
  kimonogirl: 'Kimono Girl',
  ltsurge: 'Lt. Surge',
  mrfuji: 'Mr. Fuji',
  ninjaboy: 'Ninja Boy',
  nurseryaide: 'Nursery Aide',
  oldcouple: 'Old Couple',
  parasollady: 'Parasol Lady',
  plasmagrunt: 'Plasma Grunt',
  pokefan: 'Poké Fan',
  pokekid: 'Poké Kid',
  pokemaniac: 'Poké Maniac',
  pokemonbreeder: 'Pokémon Breeder',
  pokemonranger: 'Pokémon Ranger',
  psychicfjp: 'Psychic (Female, JP)',
  richboy: 'Rich Boy',
  rocketexecutive: 'Rocket Executive',
  rocketgrunt: 'Rocket Grunt',
  ruinmaniac: 'Ruin Maniac',
  schoolboy: 'School Boy',
  schoolkid: 'School Kid',
  shadowtriad: 'Shadow Triad',
  sisandbro: 'Sis & Bro',
  srandjr: 'Sr. & Jr.',
  supernerd: 'Super Nerd',
  swimmerfjp: 'Swimmer (Female, JP)',
  teamaquabeta: 'Team Aqua (Beta)',
  teamaquagrunt: 'Team Aqua Grunt',
  teammagmagrunt: 'Team Magma Grunt',
  teamrocket: 'Team Rocket',
  teamrocketgrunt: 'Team Rocket Grunt',
  triathletebiker: 'Triathlete (Biker)',
  triathleterunner: 'Triathlete (Runner)',
  triathleteswimmer: 'Triathlete (Swimmer)',
  workerice: 'Worker (Ice)',
  youngcouple: 'Young Couple',
};

const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const variantNames: Record<string, string> = {
  capbackward: 'Cap Backward',
  pokeathlon: 'Pokéathlon',
  pwt: 'PWT',
  wonderlauncher: 'Wonder Launcher',
};

const avatarName = (id: string): string => {
  const [base = id, ...variants] = id.split('-');
  const gender = /^(.*?)(f|m)$/.exec(base);
  const stem =
    gender?.[1] &&
    !compoundNames[base] &&
    (compoundNames[gender[1]] || trainerAvatarBases.has(gender[1]))
      ? gender[1]
      : base;
  const name = compoundNames[stem] ?? titleCase(stem);
  const genderLabel =
    stem !== base ? ` (${base.endsWith('f') ? 'Female' : 'Male'})` : '';
  const variantLabel = variants.map((variant) => {
    const generation = /^gen(\d+)(.*)$/.exec(variant);
    if (!generation) return variantNames[variant] ?? titleCase(variant);
    const suffix = generation[2] ?? '';
    const edition = /^(frlg|bw2?|rb|rs|dp|jp|pt)(.*)$/.exec(suffix);
    return `Gen ${generation[1]}${edition ? ` ${edition[1]!.toUpperCase()}${edition[2] ? ` ${titleCase(edition[2])}` : ''}` : suffix ? ` ${suffix.length === 1 ? suffix.toUpperCase() : titleCase(suffix)}` : ''}`;
  });
  return `${name}${genderLabel}${variantLabel.length ? ` · ${variantLabel.join(' · ')}` : ''}`;
};

export const trainerAvatarOptions = Object.entries(avatars).map(
  ([id, { bottom, height }]) => ({
    id,
    bottom,
    height,
    name: avatarName(id),
  }),
);

export const isTrainerAvatar = (value: unknown): value is string =>
  typeof value === 'string' && trainerAvatarIds.has(value);
