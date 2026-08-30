import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DTO_DIRECTORIES = [
  'src/application/command/dto/request',
  'src/application/command/dto/response',
  'src/application/query/dto/request',
  'src/application/query/dto/response',
] as const;

describe('application DTO conventions', () => {
  const dtoFiles = DTO_DIRECTORIES.flatMap((directory) =>
    readdirSync(join(process.cwd(), directory))
      .filter((fileName) => fileName.endsWith('.ts'))
      .map((fileName) => join(directory, fileName)),
  );

  it.each(dtoFiles)('%s is initialized only through of()', (filePath) => {
    const source = readFileSync(join(process.cwd(), filePath), 'utf8');

    expect(source).toContain('private constructor');
    expect(source).toMatch(/static of\s*\(/);
    expect(source).not.toMatch(/^export\s+(?:interface|type)\s+/m);
  });
});
