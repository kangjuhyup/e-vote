import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function collectTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return path.endsWith('.ts') ? [path] : [];
  });
}

function hasImportFromLayer(source: string, layer: string): boolean {
  return new RegExp(
    String.raw`from\s+['"][^'"]*(?:\.\./)*(?:src/)?${layer}(?:/|['"])`,
  ).test(source);
}

function containsNullValueContract(source: string): boolean {
  return /\bnull\b|toBeNull\(\)/.test(source);
}

describe('layer boundaries', () => {
  const sourceRoot = join(process.cwd(), 'src');

  it('keeps presentation DTOs as transport-local schemas', () => {
    const presentationRouteRoot = join(sourceRoot, 'presentation', 'route');
    const dtoFiles = collectTypeScriptFiles(presentationRouteRoot).filter(
      (file) => file.includes('/dto/') && file.endsWith('.dto.ts'),
    );

    const offenders = dtoFiles
      .filter((file) => {
        const source = readFileSync(file, 'utf8');

        return (
          hasImportFromLayer(source, 'application') ||
          hasImportFromLayer(source, 'domain') ||
          hasImportFromLayer(source, 'infrastructure')
        );
      })
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps application and domain independent from infrastructure modules', () => {
    const files = [
      ...collectTypeScriptFiles(join(sourceRoot, 'application')),
      ...collectTypeScriptFiles(join(sourceRoot, 'domain')),
    ];

    const offenders = files
      .filter((file) =>
        hasImportFromLayer(readFileSync(file, 'utf8'), 'infrastructure'),
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('uses undefined instead of null for optional application and domain values', () => {
    const testFiles = collectTypeScriptFiles(
      join(process.cwd(), 'test'),
    ).filter((file) => !file.endsWith('layer-boundary.spec.ts'));
    const files = [...collectTypeScriptFiles(sourceRoot), ...testFiles];

    const offenders = files
      .filter((file) => containsNullValueContract(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
