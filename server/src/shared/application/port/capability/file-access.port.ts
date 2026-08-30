export const FILE_ACCESS_PORT = Symbol('FILE_ACCESS_PORT');

export interface FileAccessPort {
  existsById(id: string): Promise<boolean>;
}
