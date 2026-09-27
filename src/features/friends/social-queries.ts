import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { friendPage, ownPlayer } from './friends-client';

export const identityQuery = (owner: string) =>
  queryOptions({
    queryKey: ['social', owner, 'identity'],
    queryFn: () => ownPlayer(owner),
    refetchInterval: 60_000,
  });

export const friendsPageQuery = (
  owner: string,
  view: 'friends' | 'incoming' | 'outgoing',
) =>
  infiniteQueryOptions({
    queryKey: ['social', owner, 'friends', view],
    queryFn: ({ pageParam }) => friendPage(owner, view, pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 60_000,
  });
