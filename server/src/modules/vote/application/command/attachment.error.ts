export class AttachmentNotFoundError extends Error {
  constructor() {
    super('attachment not found');
  }
}
