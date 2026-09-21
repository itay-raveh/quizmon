import { afterEach, expect, test, vi } from 'vitest';
import { canShareFriendLink, shareFriendLink } from './friend-sharing';

const url = 'https://quizmon.test/#friend=AABBCCDDEEFF0011';

afterEach(() => vi.unstubAllGlobals());

test('shares an invitation message and link when native sharing is available', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });

  expect(canShareFriendLink()).toBe(true);
  expect(await shareFriendLink(url)).toBe('shared');
  expect(share).toHaveBeenCalledWith({
    title: 'Quizmon',
    text: 'Come play Quizmon with me! Add me as a friend and compare our Daily Challenge scores.',
    url,
  });
});

test('copies the link when native sharing is unavailable', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });

  expect(canShareFriendLink()).toBe(false);
  expect(await shareFriendLink(url)).toBe('copied');
  expect(writeText).toHaveBeenCalledWith(url);
});

test('does not copy after the share sheet is cancelled', async () => {
  const writeText = vi.fn();
  vi.stubGlobal('navigator', {
    share: vi.fn().mockRejectedValue(new DOMException('', 'AbortError')),
    clipboard: { writeText },
  });

  expect(await shareFriendLink(url)).toBe('cancelled');
  expect(writeText).not.toHaveBeenCalled();
});

test('copies the link if the native share sheet fails', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', {
    share: vi.fn().mockRejectedValue(new Error('Share unavailable')),
    clipboard: { writeText },
  });

  expect(await shareFriendLink(url)).toBe('copied');
  expect(writeText).toHaveBeenCalledWith(url);
});
