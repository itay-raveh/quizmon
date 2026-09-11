import { readPlayerData, updatePlayerData } from '@/lib/storage/player-storage';

export const shouldShowGenerationPrompt = (): boolean => {
  const data = readPlayerData();
  return !data.settings && !data.generationPromptAnswered;
};

export const markGenerationPromptAnswered = () => {
  updatePlayerData({ generationPromptAnswered: true });
};
