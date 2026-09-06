type VoteApiErrorEnvelope = {
  error?: {
    message?: unknown;
  };
};

export class VoteApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'VoteApiError';
  }
}

export async function toVoteApiError(response: Response): Promise<Error> {
  const fallback = `Vote API request failed: ${response.status}`;

  try {
    const payload = (await response.json()) as VoteApiErrorEnvelope;
    const message = payload.error?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return new VoteApiError(message, response.status);
    }
  } catch {
    // Fall back to the status-only message when the response is not JSON.
  }

  return new VoteApiError(fallback, response.status);
}
