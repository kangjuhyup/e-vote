import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DTO_DIRECTORY_SUFFIXES = [
  'application/command/dto/request',
  'application/command/dto/response',
  'application/query/dto/request',
  'application/query/dto/response',
] as const;

describe('application DTO conventions', () => {
  const moduleNames = readdirSync(join(process.cwd(), 'src/modules'));
  const dtoFiles = moduleNames.flatMap((moduleName) =>
    DTO_DIRECTORY_SUFFIXES.flatMap((suffix) => {
      const directory = join('src/modules', moduleName, suffix);

      try {
        return readdirSync(join(process.cwd(), directory))
          .filter((fileName) => fileName.endsWith('.ts'))
          .map((fileName) => join(directory, fileName));
      } catch {
        return [];
      }
    }),
  );

  it.each(dtoFiles)('%s is initialized only through of()', (filePath) => {
    const source = readFileSync(join(process.cwd(), filePath), 'utf8');

    expect(source).toContain('private constructor');
    expect(source).toMatch(/static of\s*\(/);
    expect(source).not.toMatch(/^export\s+(?:interface|type)\s+/m);
  });
});
