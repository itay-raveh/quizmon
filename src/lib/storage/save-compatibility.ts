import { readRecordedGame } from '../../domain/player/game-history.ts';
import { defaultGameSettings } from '../../domain/settings/game-settings.ts';
import {
  validEdit,
  type Action,
  type TrainingConfig,
} from '../../domain/sync/progress.ts';
import { archiveCompletion } from '../../domain/sync/round-facts.ts';

const editUnit = {
  name: 'name',
  avatar: 'avatar',
  partnerPokemon: 'partner',
  specialty: 'specialty',
  answerFlow: 'answer_flow',
  timerDisplay: 'timer_display',
  training: 'training',
} as const;

function convertTraining(value: TrainingConfig) {
  return {
    training_mode: value.trainingMode,
    difficulty: value.difficulty ?? defaultGameSettings.difficulty,
    question_selection:
      value.questionSelection ?? defaultGameSettings.questionSelection,
    generations: value.generations,
    form_groups: value.formGroups ?? defaultGameSettings.formGroups,
    question_types: value.questionTypes,
    auto_types: value.automaticQuestionTypes ?? null,
  };
}

export function convertSavedActionV1(action: Action) {
  if (action.kind === 'completion.record') {
    const completion = readRecordedGame(action.payload);
    if (
      completion.completionId !== action.operationId ||
      completion.datasetId !== action.datasetId
    )
      throw new Error('An old round change has mismatched identities.');
    const { credited: _credited, ...round } = archiveCompletion(completion);
    void _credited;
    return {
      id: action.operationId,
      datasetId: action.datasetId,
      kind: 'round',
      payload: round,
    };
  }
  if (action.kind === 'profile.patch' || action.kind === 'preferences.patch') {
    if (!validEdit(action.payload))
      throw new Error('An old profile change cannot be converted.');
    const edit = action.payload;
    return {
      id: action.operationId,
      datasetId: action.datasetId,
      kind: 'edit',
      payload: {
        id: action.operationId,
        unit: editUnit[edit.unit],
        value:
          edit.unit === 'training'
            ? convertTraining(edit.value as TrainingConfig)
            : edit.value,
      },
    };
  }
  return null;
}
