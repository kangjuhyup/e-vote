export function isDevelopmentParticipationLinkEnabled(
  nodeEnvironment: string | undefined,
  npmLifecycleEvent?: string,
): boolean {
  if (nodeEnvironment !== undefined) {
    return nodeEnvironment === 'development' || nodeEnvironment === 'test';
  }
  return (
    npmLifecycleEvent === 'start:dev' || npmLifecycleEvent === 'start:debug'
  );
}
