const REQUEST_ID_HEADER = 'x-request-id';

type ResponseHeaderReader = {
  getHeader(name: string): number | string | string[] | undefined;
};

export function getResponseRequestId(
  response: ResponseHeaderReader,
): string | undefined {
  const requestId = response.getHeader(REQUEST_ID_HEADER);

  if (Array.isArray(requestId)) {
    return requestId[0];
  }

  return requestId === undefined ? undefined : String(requestId);
}
