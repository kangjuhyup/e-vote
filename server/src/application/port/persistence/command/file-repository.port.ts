export const FILE_REPOSITORY_PORT = Symbol('FILE_REPOSITORY_PORT');

export interface FileRepositoryPort {
  existsById(fileId: string): Promise<boolean>;
}
