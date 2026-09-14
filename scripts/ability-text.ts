import ts from 'typescript';
import { generations } from '../src/domain/pokemon/types.ts';
import type { TopicCatalog } from '../src/domain/quiz/topic-catalog.ts';

const source =
  'https://raw.githubusercontent.com/smogon/pokemon-showdown/aa6d5f0856d24679be8f5df167d1b528c2dcbd71/data/text/abilities.ts';
type TextEntry = {
  shortDesc?: string;
  desc?: string;
  generations: Record<number, TextEntry>;
};

export const parseAbilityText = (text: string) => {
  const file = ts.createSourceFile(
    'abilities.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const read = (node: ts.ObjectLiteralExpression): TextEntry => {
    const entry: TextEntry = { generations: {} };
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = property.name.getText(file).replace(/^['"]|['"]$/g, '');
      if (key === 'shortDesc' || key === 'desc') {
        if (!ts.isStringLiteralLike(property.initializer))
          throw new Error(`Nonliteral ability ${key}`);
        entry[key] = property.initializer.text;
      } else if (/^gen\d+$/.test(key)) {
        if (!ts.isObjectLiteralExpression(property.initializer))
          throw new Error('Nonliteral generation text');
        entry.generations[Number(key.slice(3))] = read(property.initializer);
      }
    }
    return entry;
  };
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        declaration.name.getText(file) !== 'AbilitiesText' ||
        !declaration.initializer ||
        !ts.isObjectLiteralExpression(declaration.initializer)
      )
        continue;
      return Object.fromEntries(
        declaration.initializer.properties.map((property) => {
          if (
            !ts.isPropertyAssignment(property) ||
            !ts.isObjectLiteralExpression(property.initializer)
          )
            throw new Error('Invalid ability text entry');
          return [
            property.name.getText(file).replace(/^['"]|['"]$/g, ''),
            read(property.initializer),
          ];
        }),
      );
    }
  }
  throw new Error('Missing AbilitiesText');
};

export const addAbilityDescriptions = async (
  abilities: TopicCatalog['abilities'],
  text?: string,
): Promise<void> => {
  if (text === undefined) {
    const response = await fetch(source);
    if (!response.ok)
      throw new Error(`Ability descriptions: HTTP ${response.status}`);
    text = await response.text();
  }
  const entries = parseAbilityText(text);
  for (const ability of abilities) {
    const entry = entries[ability.name.replace(/[^a-z0-9]/g, '')];
    ability.descriptions = [];
    if (!entry) continue;
    const introduced = Math.min(
      ...ability.generations.map((gen) => generations.indexOf(gen)),
    );
    for (const [index, generation] of generations.entries()) {
      if (index < introduced) continue;
      // Showdown inherits the nearest later generation override for each field.
      const field = (key: 'shortDesc' | 'desc') =>
        Object.entries(entry.generations)
          .filter(([gen, value]) => Number(gen) >= index + 1 && value[key])
          .sort(([a], [b]) => Number(a) - Number(b))[0]?.[1][key] ?? entry[key];
      const short = field('shortDesc')?.replace(/\s+/g, ' ').trim();
      if (!short || /^(No competitive use\.|See |Does nothing\.)/i.test(short))
        continue;
      ability.descriptions.push({
        generation,
        text: short,
        explanation: (field('desc') || short).replace(/\s+/g, ' ').trim(),
      });
    }
    if (ability.descriptions.length) ability.descriptionSource = source;
  }
};
