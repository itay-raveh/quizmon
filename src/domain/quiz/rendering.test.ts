import { describe, expect, it } from 'vitest';
import { questionRenderingSchema } from './rendering';
import type {
  QuestionRuleEntry,
  RenderingControlsFor,
} from './question-rules/types';
import type { FamilyRules } from './questions/family-rules';
import { baseQuestionRendering, resolveQuestionRendering } from './variants';

describe('question rendering rules', () => {
  it('accepts the base rendering', () => {
    expect(
      questionRenderingSchema.safeParse(baseQuestionRendering).success,
    ).toBe(true);
  });

  it('validates the Level 5 type policy and rejects unknown values', () => {
    const rendering = resolveQuestionRendering('evolutionGainedType', 5);
    expect(rendering.subject.types).toBe('after-answer');
    expect(rendering.related.types).toBe('after-answer');
    expect(
      resolveQuestionRendering('evolutionGainedType', 3).subject.types,
    ).toBe('always');
    expect(questionRenderingSchema.safeParse(rendering).success).toBe(true);
    expect(
      questionRenderingSchema.safeParse({
        ...rendering,
        search: { ...rendering.search, name: 'never' },
      }).success,
    ).toBe(false);
    expect(
      questionRenderingSchema.safeParse({
        ...rendering,
        subject: { ...rendering.subject, types: 'sometimes' },
      }).success,
    ).toBe(false);
  });

  it('applies family defaults and level overrides', () => {
    const silhouette = resolveQuestionRendering('silhouetteForPokemon', 4);
    expect(silhouette.subject.sprite).toBeNull();
    expect(silhouette.choices.sprite?.silhouette).toBe(true);
    expect(silhouette.choices.name).toBe('after-answer');

    const counterPick = resolveQuestionRendering('superEffectiveAttacker', 3);
    expect(counterPick.related.name).toBe('never');
    expect(counterPick.subject.types).toBe('after-answer');
  });
});

const unsupportedTypeChoices = {
  // @ts-expect-error TypeAnswerPicker does not consume choice rendering.
  choices: { name: 'never' },
} satisfies RenderingControlsFor<'pokemonTypes'>;
void unsupportedTypeChoices;

const unsupportedCounterPick = {
  // @ts-expect-error This artwork always reveals subject types after answering.
  subject: { types: 'never' },
} satisfies RenderingControlsFor<'superEffectiveAttacker'>;
void unsupportedCounterPick;

const itemChoicesWithoutIdentity = {
  // @ts-expect-error Item choices need a name or sprite.
  choices: { name: 'never', sprite: null },
} satisfies RenderingControlsFor<'itemIdentification'>;
void itemChoicesWithoutIdentity;

const searchWithoutName = {
  // @ts-expect-error Search controls cannot remove the required name.
  search: { name: 'never' },
} satisfies RenderingControlsFor<'itemIdentification'>;
void searchWithoutName;

const pokemonChoicesWithoutIdentity = {
  choices: {
    // @ts-expect-error Pokémon choices need at least one visible field.
    sprite: null,
    name: 'never',
    number: 'never',
    types: 'never',
  },
} satisfies RenderingControlsFor<'spriteForPokemon'>;
void pokemonChoicesWithoutIdentity;

const pokemonSearchWithoutName = {
  // @ts-expect-error Search always needs a name for query and selection.
  search: { name: 'never' },
} satisfies RenderingControlsFor<'pokemonFromSilhouette'>;
void pokemonSearchWithoutName;

const itemWithPokemonSource = {
  subject: {
    // @ts-expect-error Item art has no alternate Pokémon sprite source.
    sprite: { reveal: 'always', silhouette: false, source: 'all' },
  },
} satisfies RenderingControlsFor<'itemIdentification'>;
void itemWithPokemonSource;

const cropWithHistoricalSource = {
  subject: {
    // @ts-expect-error The crop focus only describes the current front sprite.
    sprite: { reveal: 'always', silhouette: false, source: 'all' },
  },
} satisfies RenderingControlsFor<'pokemonFromPixelCrop'>;
void cropWithHistoricalSource;

const shinyChoicesWithoutIdentity = {
  // @ts-expect-error Shiny choices need a visible field before answering.
  choices: { sprite: null, name: 'never', number: 'never', types: 'never' },
} satisfies RenderingControlsFor<'shinyPokemonIdentification'>;
void shinyChoicesWithoutIdentity;

type FieldNotesChoiceRendering = NonNullable<
  Extract<
    QuestionRuleEntry<FamilyRules['pokedexEntryMatch'], 'pokedexEntryMatch'>,
    { response: { kind: 'choices' } }
  >['rendering']
>;
const fieldNotesChoiceSubject = {
  // @ts-expect-error The hidden subject portrait is only rendered in search mode.
  subject: { sprite: null },
} satisfies FieldNotesChoiceRendering;
void fieldNotesChoiceSubject;
