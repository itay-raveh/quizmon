import { GameButton } from '@/components/GameButton';
import { GenerationLabel } from '@/components/GenerationLabel';
import { CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatPokedexNumber,
  formatGeneration,
  formatPokemonName,
  formatPokemonTypeAnnouncement,
} from '@/domain/pokemon/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getQuestionRendering } from '@/domain/quiz/variants';
import { getQuestionView } from '@/domain/quiz/presentation';
import { isVisible, spriteState } from '@/domain/quiz/rendering';
import type { QuestionData } from '@/domain/quiz/types';
import { AnswerEffectiveness } from './AnswerEffectiveness';
import { memo } from 'react';
import { answerOptionState } from './answer-option-state';
import { MoveReveal } from './MoveReveal';
import { NatureEffect } from './NatureEffect';
import {
  ItemRenderable,
  PokemonRenderable,
  QuestionIdentity,
} from './QuestionEntity';

interface QuestionAnswerChoiceProps {
  question: QuestionData;
  option: string;
  index: number;
  answered: boolean;
  cluesShown: number;
  selected: boolean;
  onSelect: (option: string) => void;
  typeRelations?: PokemonCatalog['typeRelations'];
}

const QuestionAnswerChoiceInner = ({
  question,
  option,
  index,
  answered,
  cluesShown,
  selected,
  onSelect,
  typeRelations,
}: QuestionAnswerChoiceProps) => {
  const multiSelect = question.answer.interaction === 'multi-select';
  const policy = getQuestionRendering(question).choices;
  const view = getQuestionView(question);
  const hasTypeOptionBadges = view.answer.kind === 'type';
  const isItemChoice = view.answer.kind === 'item';
  const state = { answered, cluesShown };
  const typeRule = policy.types;
  const revealsOptionTypes = isVisible(typeRule, state);
  const concealed =
    !isVisible(policy.name, state) &&
    !isVisible(policy.number, state) &&
    !revealsOptionTypes;
  const showdownStat =
    question.visual?.kind === 'statExtremes' ? question.visual.stat : undefined;
  const label = question.optionLabels?.[option] ?? formatPokemonName(option);
  const reveal = question.optionReveals?.[option];
  const measurement = question.visual?.kind === 'measurement-comparison';
  const detail =
    reveal && !measurement ? (
      <span
        aria-hidden="true"
        className={`answer__reveal ${answered ? '' : 'answer__reveal--reserved'}`.trim()}
      >
        {view.answer.kind === 'text' && view.answer.detail === 'nature' ? (
          <NatureEffect description={reveal} compact />
        ) : view.answer.kind === 'text' && view.answer.detail === 'move' ? (
          <MoveReveal description={reveal} />
        ) : (
          reveal
        )}
      </span>
    ) : null;
  const itemImage = question.optionImages?.[option];
  const visual =
    view.answer.kind === 'pokemon'
      ? question.optionVisuals?.[option]
      : undefined;
  const hasSprite = Boolean(visual?.src && policy.sprite !== null);
  const dexNumber =
    question.optionDexNumbers?.[option] ??
    question.optionVisuals?.[option]?.dexNumber;
  const optionSelected = selected;
  const optionCorrect = question.answer.correctOptions.includes(option);
  const outcome = answerOptionState({
    answered,
    multiSelect,
    selected: optionSelected,
    correct: optionCorrect,
  });
  const optionClassName = `answer${outcome === 'idle' ? '' : ` answer--${outcome}`}`;
  const typeAnnouncement =
    revealsOptionTypes &&
    visual &&
    (isVisible(policy.name, state) || isVisible(policy.number, state))
      ? ` ${formatPokemonTypeAnnouncement(visual.types)}`
      : '';
  const resultAnnouncement =
    outcome === 'missed'
      ? ' Correct answer, not selected.'
      : outcome === 'wrong' && multiSelect
        ? ' Wrong pick.'
        : '';
  const classification = question.optionClassifications?.[option];
  const classificationAnnouncement =
    answered && classification
      ? `. ${classification === 'Neither' ? 'Neither Legendary nor Mythical' : classification}.`
      : '';
  const generation = question.optionGenerations?.[option];
  const generationAnnouncement =
    answered && generation ? `. ${formatGeneration(generation)}.` : '';
  const statValue = question.optionStats?.[option];
  const hasStatValue =
    (showdownStat !== undefined && statValue !== undefined) ||
    (measurement && reveal !== undefined);
  const revealsStat = answered && hasStatValue;
  const statAnnouncement =
    revealsStat && showdownStat !== undefined
      ? `. ${formatPokemonName(showdownStat)}: ${statValue}.`
      : '';
  const stat = hasStatValue ? (
    <span
      aria-hidden="true"
      className={`answer__stat ${revealsStat ? '' : 'answer__stat--reserved'}`.trim()}
    >
      {measurement ? reveal : statValue}
    </span>
  ) : null;
  const selectionMark =
    outcome === 'missed' ? (
      <MinusIcon weight="bold" />
    ) : answered && optionCorrect ? (
      <CheckIcon weight="bold" />
    ) : answered && optionSelected ? (
      <XIcon weight="bold" />
    ) : (
      index + 1
    );
  const attackTypes = typeRelations
    ? question.visual?.kind === 'typeMatchup'
      ? [option]
      : question.visual?.kind === 'superEffectiveAttacker'
        ? visual?.types
        : undefined
    : undefined;
  const answerButton = (
    <GameButton
      aria-label={`${
        answered || isVisible(policy.name, state)
          ? label
          : isVisible(policy.number, state) && dexNumber !== undefined
            ? formatPokedexNumber(dexNumber)
            : revealsOptionTypes && visual
              ? formatPokemonTypeAnnouncement(visual.types)
              : `${
                  hasSprite
                    ? spriteState(policy.sprite, state).silhouette
                      ? 'Silhouette'
                      : 'Sprite'
                    : 'Choice'
                } ${index + 1}`
      }${answered && reveal ? `. ${reveal}.` : ''}${typeAnnouncement}${generationAnnouncement}${classificationAnnouncement}${statAnnouncement}${resultAnnouncement}`}
      aria-keyshortcuts={
        question.options.length <= 9 ? String(index + 1) : undefined
      }
      aria-pressed={multiSelect ? optionSelected : undefined}
      className={`${optionClassName} ${hasSprite ? 'answer--pokemon' : ''} ${isItemChoice && itemImage && policy.sprite !== null ? 'answer--item' : ''} ${concealed ? 'answer--concealed' : ''}`.trim()}
      disabled={answered}
      onClick={() => onSelect(option)}
      sound="none"
    >
      <kbd aria-hidden="true">{selectionMark}</kbd>
      {isItemChoice ? (
        <ItemRenderable
          className="answer__item-renderable"
          name={label}
          src={itemImage}
          policy={policy}
          state={state}
          spriteSlotClassName="answer__item-slot"
          spriteClassName="answer__item-sprite"
          nameClassName="answer__text"
        />
      ) : visual ? (
        <PokemonRenderable
          name={option}
          dexNumber={dexNumber}
          src={hasSprite ? visual.src : undefined}
          types={visual.types}
          policy={{ ...policy, types: typeRule }}
          state={state}
          spriteSlotClassName={hasSprite ? 'answer__sprite-field' : undefined}
          spriteClassName="answer__sprite"
          identityClassName={`${hasSprite ? 'answer__nameplate' : 'answer__identity'} ${hasStatValue ? (hasSprite ? 'answer__nameplate--stat' : 'answer__identity--stat') : ''}`.trim()}
          nameClassName="answer__name"
          typesClassName={`answer__types ${revealsOptionTypes ? '' : 'answer__types--reserved'}`.trim()}
          hideNumberFromAccessibility
        >
          {classification ? (
            <span
              aria-hidden="true"
              className={`answer__classification ${answered ? '' : 'answer__classification--reserved'}`.trim()}
            >
              {classification}
            </span>
          ) : null}
          {generation ? (
            <span
              aria-hidden="true"
              className={`answer__generation ${answered ? '' : 'answer__generation--reserved'}`.trim()}
            >
              <GenerationLabel generation={generation} />
            </span>
          ) : null}
          {detail}
          {stat}
        </PokemonRenderable>
      ) : hasTypeOptionBadges ? (
        <TypeBadges className="answer__type-choice" types={[option]} />
      ) : dexNumber !== undefined ? (
        <QuestionIdentity
          policy={policy}
          state={state}
          className={`answer__identity ${hasStatValue ? 'answer__identity--stat' : ''}`.trim()}
          dexNumber={dexNumber}
          hideNumberFromAccessibility
          name={option}
          nameClassName="answer__name"
        >
          {detail}
          {stat}
        </QuestionIdentity>
      ) : (
        <span className="answer__text">
          {question.optionDetails?.[option]?.length ? (
            <span className="answer__effects" aria-hidden="true">
              {question.optionDetails[option].map((row, index) => (
                <span className="answer__effect" key={index}>
                  <strong>{row.value}</strong>
                  <span>{row.label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span>{label}</span>
          )}
          {detail}
          {classification || generation ? (
            <span
              aria-hidden="true"
              className="answer__text-detail"
              style={{ visibility: answered ? undefined : 'hidden' }}
            >
              {classification ? <span>{classification}</span> : null}
              {generation ? <GenerationLabel generation={generation} /> : null}
            </span>
          ) : null}
        </span>
      )}
    </GameButton>
  );
  return attackTypes && typeRelations ? (
    <div
      className={`answer-matchup ${visual ? 'answer-matchup--pokemon' : ''}`.trim()}
    >
      {answerButton}
      {answered ? (
        <AnswerEffectiveness
          option={option}
          isTypeOption={question.visual?.kind === 'typeMatchup'}
          attackTypes={attackTypes}
          defenderTypes={question.subject.types ?? []}
          typeRelations={typeRelations}
        />
      ) : null}
    </div>
  ) : (
    answerButton
  );
};

export const QuestionAnswerChoice = memo(QuestionAnswerChoiceInner);
