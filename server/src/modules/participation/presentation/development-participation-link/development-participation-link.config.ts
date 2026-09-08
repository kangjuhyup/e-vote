export function isDevelopmentParticipationLinkEnabled(
  nodeEnvironment: string | undefined,
): boolean {
  return nodeEnvironment === 'development' || nodeEnvironment === 'test';
}
