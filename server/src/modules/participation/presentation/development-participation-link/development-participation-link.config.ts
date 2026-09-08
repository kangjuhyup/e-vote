export function isDevelopmentParticipationLinkEnabled(
  nodeEnvironment: string | undefined,
): boolean {
  const normalizedNodeEnvironment = nodeEnvironment?.trim();

  return (
    normalizedNodeEnvironment === 'development' ||
    normalizedNodeEnvironment === 'test'
  );
}
