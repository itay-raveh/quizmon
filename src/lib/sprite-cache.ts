const usableSpriteResponse = (
  response: Response | undefined,
): Response | null =>
  response?.status === 200 &&
  response.headers.get('Content-Type')?.startsWith('image/')
    ? response
    : null;

export const spriteCachePlugin = {
  cacheWillUpdate: ({ response }: { response: Response }) =>
    Promise.resolve(usableSpriteResponse(response)),
  cachedResponseWillBeUsed: ({
    cachedResponse,
  }: {
    cachedResponse?: Response;
  }) => Promise.resolve(usableSpriteResponse(cachedResponse)),
};
