export type Visibility = 'always' | 'after-answer' | 'never';
export type SpriteVisibility =
  Visibility | 'silhouette' | { afterClues: number; silhouette?: boolean };

export interface EntityRendering {
  sprite: SpriteVisibility;
  name: Visibility;
  number: Visibility;
}

const renderingRoles = ['subject', 'choices', 'related', 'search'] as const;
type RenderingRole = (typeof renderingRoles)[number];
export type QuestionRendering = Record<RenderingRole, EntityRendering>;
export type RenderingOverrides = {
  [Role in RenderingRole]?: Partial<EntityRendering>;
};

export interface RevealState {
  answered: boolean;
  cluesShown: number;
}

export const isVisible = (
  rule: Visibility,
  { answered }: RevealState,
): boolean => rule === 'always' || (rule === 'after-answer' && answered);

export const spriteState = (rule: SpriteVisibility, state: RevealState) => ({
  visible:
    typeof rule === 'object'
      ? state.answered || state.cluesShown >= rule.afterClues
      : rule === 'silhouette' || isVisible(rule, state),
  silhouette:
    !state.answered &&
    (typeof rule === 'object'
      ? Boolean(rule.silhouette)
      : rule === 'silhouette'),
});

const mergeEntityRendering = (
  defaults: EntityRendering,
  overrides?: Partial<EntityRendering>,
): EntityRendering => ({
  sprite: overrides?.sprite ?? defaults.sprite,
  name: overrides?.name ?? defaults.name,
  number: overrides?.number ?? defaults.number,
});

export const mergeRendering = (
  defaults: QuestionRendering,
  overrides?: RenderingOverrides,
): QuestionRendering => ({
  subject: mergeEntityRendering(defaults.subject, overrides?.subject),
  choices: mergeEntityRendering(defaults.choices, overrides?.choices),
  related: mergeEntityRendering(defaults.related, overrides?.related),
  search: mergeEntityRendering(defaults.search, overrides?.search),
});

const visibilityValues: readonly Visibility[] = [
  'always',
  'after-answer',
  'never',
];
const isVisibility = (value: unknown): value is Visibility =>
  visibilityValues.some((visibility) => value === visibility);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isSpriteVisibility = (value: unknown): value is SpriteVisibility =>
  isVisibility(value) ||
  value === 'silhouette' ||
  (record(value) &&
    Number.isSafeInteger(value.afterClues) &&
    typeof value.afterClues === 'number' &&
    value.afterClues >= 0 &&
    (value.silhouette === undefined || typeof value.silhouette === 'boolean'));

export const isQuestionRendering = (
  value: unknown,
): value is QuestionRendering =>
  record(value) &&
  renderingRoles.every((role) => {
    const entity = value[role];
    return (
      record(entity) &&
      isSpriteVisibility(entity.sprite) &&
      isVisibility(entity.name) &&
      isVisibility(entity.number)
    );
  });
