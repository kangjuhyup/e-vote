import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectEntityFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return collectEntityFiles(path);
    }

    return entry.endsWith('.ts') ? [path] : [];
  });
}

describe('database entity domain isolation', () => {
  it('does not import domain code from persistence entities', () => {
    const entityFiles = [
      ...collectEntityFiles(
        join(process.cwd(), 'src/platform/database/entity'),
      ),
      ...readdirSync(join(process.cwd(), 'src/modules')).flatMap(
        (moduleName) => {
          const entityDirectory = join(
            process.cwd(),
            'src/modules',
            moduleName,
            'infrastructure/database/entity',
          );

          try {
            return collectEntityFiles(entityDirectory);
          } catch {
            return [];
          }
        },
      ),
    ];

    expect(entityFiles.length).toBeGreaterThan(0);

    for (const file of entityFiles) {
      const source = readFileSync(file, 'utf8');

      expect(source).not.toContain("from '../../../domain");
      expect(source).not.toContain("from '../../domain");
      expect(source).not.toContain("from '../domain");
      expect(source).not.toContain('src/domain');
    }
  });
});
