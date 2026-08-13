import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('database entity domain isolation', () => {
  it('does not import domain code from persistence entities', () => {
    const entityDir = join(process.cwd(), 'src/infrastructure/database/entity');
    const entityFiles = readdirSync(entityDir).filter((file) =>
      file.endsWith('.ts'),
    );

    expect(entityFiles).toContain('index.ts');

    for (const file of entityFiles) {
      const source = readFileSync(join(entityDir, file), 'utf8');

      expect(source).not.toContain("from '../../../domain");
      expect(source).not.toContain("from '../../domain");
      expect(source).not.toContain("from '../domain");
      expect(source).not.toContain('src/domain');
    }
  });
});
