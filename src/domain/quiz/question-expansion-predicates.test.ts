import {
  catalog,
  createQuestionContext,
} from '../../../tests/fixtures/catalog';
import { formatPokemonName } from '../pokemon/format';
import { statNames } from '../pokemon/types';
import {
  expansionVariants,
  getQuestionVariant,
  type ExpansionQuestionType,
} from './question-variants';
import { buildQuestionType } from './questions/registry';
import type { Difficulty } from './difficulty';

const cases = Object.entries(expansionVariants).flatMap(([type, variants]) =>
  Object.keys(variants).map((level) => ({
    type: type as ExpansionQuestionType,
    level: Number(level) as Difficulty,
  })),
);
const topics = catalog.topics!;
it.each(cases)(
  'validates the actual $type predicate at Level $level',
  ({ type, level }) => {
    const rules = getQuestionVariant(type, level)!.variant;
    for (let seed = 0; seed < 3; seed++) {
      const question = buildQuestionType(
        {
          ...createQuestionContext(`predicate:${type}:${level}:${seed}`),
          difficulty: level,
        },
        type,
      )!;
      expect(question).toBeDefined();
      const correct = question.answer.correctOptions[0]!;
      const wrong = question.options.filter((option) => option !== correct);
      const target = catalog.pokemon[question.subject.name];
      switch (type) {
        case 'item-identification': {
          const item = topics.items.find(
            (item) => item.name === question.subject.name,
          )!;
          const choices = question.options.map((name) =>
            topics.items.find((item) => item.name === name)!,
          );
          expect(
            choices.filter(
              (choice) => choice.spriteIdentity === item.spriteIdentity,
            ),
          ).toHaveLength(1);
          if (rules.itemChoices === 'different-categories')
            expect(new Set(choices.map((choice) => choice.category)).size).toBe(
              4,
            );
          if (
            rules.itemChoices === 'pocket' ||
            rules.itemChoices === 'category'
          )
            expect(
              choices.every((choice) => choice.pocket === item.pocket),
            ).toBe(true);
          if (rules.itemChoices === 'category')
            expect(
              choices.every((choice) => choice.category === item.category),
            ).toBe(true);
          break;
        }
        case 'medicine-cabinet': {
          const [, status, hp] = JSON.parse(question.context!) as [
            string,
            string,
            number,
          ];
          const matches = question.options.filter((name) => {
            const fact = topics.medicines.find((fact) => fact.name === name)!;
            return (
              fact.cures.includes(status) &&
              (fact.hp === 'full' || fact.hp >= hp)
            );
          });
          expect(matches).toEqual([correct]);
          if (rules.itemChoices === 'medicines')
            expect(
              question.options.every(
                (name) =>
                  topics.items.find((item) => item.name === name)?.pocket ===
                  'medicine',
              ),
            ).toBe(true);
          break;
        }
        case 'height-comparison':
        case 'weight-comparison': {
          const key = type === 'height-comparison' ? 'height' : 'weight';
          const values = question.options.map(
            (name) => catalog.pokemon[name]![key]!,
          );
          expect(new Set(values).size).toBe(4);
          const sorted = values.toSorted((a, b) => a - b);
          const high =
            question.prompt.kind === 'text' &&
            /heaviest|tallest/.test(question.prompt.text);
          expect(catalog.pokemon[correct]![key]).toBe(
            high ? sorted[3] : sorted[0],
          );
          const ratio = high
            ? sorted[3]! / sorted[2]!
            : sorted[1]! / sorted[0]!;
          expect(ratio).toBeGreaterThanOrEqual(rules.measurement!.minimumRatio);
          expect(ratio).toBeLessThanOrEqual(rules.measurement!.maximumRatio);
          expect(sorted[3]! / sorted[0]!).toBeLessThanOrEqual(
            rules.measurement!.maximumSpread,
          );
          for (const name of question.options)
            expect(question.optionReveals?.[name]).toBe(
              `${catalog.pokemon[name]![key]! / 10} ${key === 'height' ? 'm' : 'kg'}`,
            );
          break;
        }
        case 'move-types': {
          const move = topics.moves.find(
            (move) => move.name === question.subject.name,
          )!;
          expect(
            move.contexts.find((context) => context.game === question.context)
              ?.type,
          ).toBe(correct);
          if (rules.reviewedDescription && question.prompt.kind === 'text')
            expect(question.prompt.text).toContain(move.reviewedDescription!);
          break;
        }
        case 'move-purpose': {
          const rows = question.options.map((name) =>
            topics.moves
              .find((move) => move.name === name)!
              .contexts.find((context) => context.game === question.context)!,
          );
          const answer = rows[question.options.indexOf(correct)]!;
          expect(
            rows.filter((row) => row.damageClass === answer.damageClass),
          ).toHaveLength(1);
          if (rules.damageClass === 'status')
            expect(answer.damageClass).toBe('status');
          if (rules.sameMoveType)
            expect(new Set(rows.map((row) => row.type)).size).toBe(1);
          expect(question.subject.generation).not.toMatch(/^(I|II|III)$/);
          break;
        }
        case 'name-that-region': {
          const location = topics.locations.find(
            (location) => location.name === question.subject.name,
          )!;
          expect(location.region).toBe(correct);
          expect(
            topics.locations.some(
              (other) =>
                other.label === location.label && other.region !== correct,
            ),
          ).toBe(false);
          break;
        }
        case 'baby-pokemon': {
          expect(catalog.pokemon[correct]!.isBaby).toBe(true);
          expect(
            wrong.every((name) => catalog.pokemon[name]!.isBaby === false),
          ).toBe(true);
          if (rules.unevolvedDistractors)
            expect(
              wrong.every(
                (name) => catalog.pokemon[name]!.isUnevolved === true,
              ),
            ).toBe(true);
          else
            expect(
              new Set(wrong.map((name) => catalog.pokemon[name]!.isUnevolved))
                .size,
            ).toBe(2);
          break;
        }
        case 'pokedex-categories': {
          expect(
            question.options.filter(
              (name) => catalog.pokemon[name]!.genus === target!.genus,
            ),
          ).toEqual([correct]);
          if (rules.sameColorOrShape)
            expect(
              wrong.every(
                (name) =>
                  catalog.pokemon[name]!.color === target!.color ||
                  catalog.pokemon[name]!.shape === target!.shape,
              ),
            ).toBe(true);
          break;
        }
        case 'evolution-items':
        case 'evolution-conditions': {
          if (question.visual?.kind !== 'evolution-endpoints')
            throw new Error('Missing endpoints');
          const { before, after } = question.visual;
          const methods = topics.evolutions.filter(
            (entry) =>
              entry.before === before &&
              entry.after === after &&
              entry.game === question.context,
          );
          if (type === 'evolution-items') {
            expect(
              methods.some(
                (method) =>
                  method.item === correct && method.trigger === 'use-item',
              ),
            ).toBe(true);
            expect(
              wrong.some((name) =>
                methods.some(
                  (method) =>
                    method.item === name && method.trigger === 'use-item',
                ),
              ),
            ).toBe(false);
          } else {
            const labels = methods.map((method) =>
              [formatPokemonName(method.trigger), ...method.conditions].join(
                ' · ',
              ),
            );
            expect(labels).toContain(correct);
            expect(wrong.some((option) => labels.includes(option))).toBe(false);
            for (const option of wrong)
              expect(
                option
                  .split(' · ')
                  .filter(
                    (part, index) => part !== correct.split(' · ')[index],
                  ),
              ).toHaveLength(1);
          }
          break;
        }
        case 'hidden-abilities': {
          expect(
            target!
              .abilitySlots!.filter((slot) => slot.hidden)
              .map((slot) => slot.name),
          ).toEqual([correct]);
          for (const slot of target!.abilitySlots!.filter(
            (slot) => !slot.hidden,
          ))
            expect(question.options).toContain(slot.name);
          break;
        }
        case 'nature-effects': {
          const nature = topics.natures.find(
            (nature) => nature.name === correct,
          )!;
          const alternatives = wrong.map((name) =>
            topics.natures.find((nature) => nature.name === name)!,
          );
          if (rules.natureChoices === 'different-raised')
            expect(
              new Set([nature, ...alternatives].map((nature) => nature.raised))
                .size,
            ).toBe(4);
          else
            expect(
              alternatives.every(
                (other) =>
                  other.raised === nature.raised ||
                  other.lowered === nature.lowered,
              ),
            ).toBe(true);
          expect(
            alternatives.some(
              (other) =>
                other.raised === nature.raised &&
                other.lowered === nature.lowered,
            ),
          ).toBe(false);
          break;
        }
        case 'egg-group-connections': {
          expect(
            question.options.filter((name) =>
              catalog.pokemon[name]!.eggGroups!.some((group) =>
                target!.eggGroups!.includes(group),
              ),
            ),
          ).toEqual([correct]);
          break;
        }
        case 'ev-yields': {
          const stats = statNames.filter((stat) => target!.evYield![stat] > 0);
          expect(correct).toBe(
            !rules.completeEvYield
              ? formatPokemonName(stats[0]!)
              : stats
                  .map(
                    (stat) =>
                      `${target!.evYield![stat]} ${formatPokemonName(stat)}`,
                  )
                  .join(' + '),
          );
          if (!rules.completeEvYield) expect(stats).toHaveLength(1);
          break;
        }
        case 'encounter-locations': {
          const [game, area, method, conditions] = JSON.parse(
            question.context!,
          ) as [string, string, string, string[]];
          const entries = topics.encounters.filter(
            (entry) =>
              entry.game === game &&
              entry.area === area &&
              entry.method === method,
          );
          expect(
            entries.some(
              (entry) =>
                entry.complete &&
                JSON.stringify(entry.conditions) ===
                  JSON.stringify(conditions) &&
                entry.pokemon.includes(correct),
            ),
          ).toBe(true);
          expect(
            wrong.some((name) =>
              entries.some((entry) => entry.pokemon.includes(name)),
            ),
          ).toBe(false);
          if (
            question.prompt.kind === 'text' &&
            !question.prompt.supportingText?.includes('Encounter:')
          )
            expect(
              topics.encounters.some(
                (entry) =>
                  entry.game === game &&
                  entry.area === area &&
                  entry.pokemon.some((name) => wrong.includes(name)),
              ),
            ).toBe(false);
          if (rules.encounterConditions)
            for (const name of wrong)
              expect(
                topics.encounters.some(
                  (entry) =>
                    entry.game === game &&
                    entry.region === entries[0]!.region &&
                    entry.pokemon.includes(name),
                ),
              ).toBe(true);
          break;
        }
        case 'berry-flavors':
        case 'natural-gift': {
          const berry = topics.berries.find(
            (berry) => berry.name === question.subject.name,
          )!;
          const flavors = Object.keys(berry.flavors)
            .filter((flavor) => berry.flavors[flavor]! > 0)
            .sort();
          if (type === 'natural-gift') expect(correct).toBe(berry.giftType);
          else if (rules.completeFlavors)
            expect(correct).toBe(flavors.map(formatPokemonName).join(' + '));
          else {
            const highest = Math.max(...Object.values(berry.flavors));
            const strongest = flavors.filter(
              (flavor) => berry.flavors[flavor] === highest,
            );
            expect(strongest).toHaveLength(1);
            expect(correct).toBe(formatPokemonName(strongest[0]!));
          }
          break;
        }
        case 'ability-effects':
        case 'held-item-effects': {
          const fact = topics.effects.find(
            (fact) => fact.name === question.subject.name,
          )!;
          expect(fact.sources.length).toBeGreaterThan(0);
          expect(correct).toBe(
            rules.effectChoices === 'exact' ? fact.exact : fact.broad,
          );
          break;
        }
      }
    }
  },
);
