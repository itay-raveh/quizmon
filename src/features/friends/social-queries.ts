import { infiniteQueryOptions } from '@tanstack/react-query';
import { friendPage } from './friends-client';

export const friendsPageQuery = (
  owner: string,
  view: 'friends' | 'incoming' | 'outgoing',
) =>
  infiniteQueryOptions({
    queryKey: ['social', owner, 'friends', view],
    queryFn: ({ pageParam }) => friendPage(owner, view, pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
