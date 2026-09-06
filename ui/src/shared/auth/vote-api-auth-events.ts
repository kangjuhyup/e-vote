export const VOTE_API_AUTH_REQUIRED_EVENT = 'vote-api-auth-required';

export function notifyVoteApiAuthRequired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(VOTE_API_AUTH_REQUIRED_EVENT));
}

export function subscribeToVoteApiAuthRequired(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);
  return () => {
    window.removeEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);
  };
}
