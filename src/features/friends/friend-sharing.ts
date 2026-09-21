import { shareContent } from '../sharing/result-sharing';

export const canShareFriendLink = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export async function shareFriendLink(
  url: string,
): Promise<'shared' | 'cancelled' | 'copied'> {
  if (canShareFriendLink()) {
    try {
      return await shareContent({
        title: 'Quizmon',
        text: 'Come play Quizmon with me! Add me as a friend and compare our Daily Challenge scores.',
        url,
      });
    } catch {
      // The share sheet can fail even when the API exists.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    throw new Error(
      'Could not share the link. Open Show link and code to select it.',
    );
  }
}
