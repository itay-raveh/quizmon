export const noStoreResponse = (
  body: string | null,
  status: number,
  headers: Record<string, string> = {},
): Response =>
  new Response(body, {
    headers: { 'Cache-Control': 'no-store', ...headers },
    status,
  });
