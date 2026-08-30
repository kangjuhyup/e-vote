import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

function collectTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    return stat.isDirectory()
      ? collectTypeScriptFiles(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}

function relativeImportTargets(file: string): string[] {
  const source = readFileSync(file, 'utf8');

  return [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(
    ([, specifier]) => resolve(dirname(file), specifier),
  );
}

function packageImportSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8');

  return [...source.matchAll(/from\s+['"]([^.'"][^'"]*)['"]/g)].map(
    ([, specifier]) => specifier,
  );
}

function containsNullValueContract(source: string): boolean {
  return /\bnull\b|toBeNull\(\)/.test(source);
}

describe('module extraction boundaries', () => {
  const sourceRoot = join(process.cwd(), 'src');
  const modulesRoot = join(sourceRoot, 'modules');
  const moduleFiles = collectTypeScriptFiles(modulesRoot);

  it('prevents direct imports between domain modules', () => {
    const offenders = moduleFiles.flatMap((file) => {
      const sourceModule = relative(modulesRoot, file).split('/')[0];

      return relativeImportTargets(file)
        .filter((target) => target.startsWith(`${modulesRoot}/`))
        .filter(
          (target) =>
            relative(modulesRoot, target).split('/')[0] !== sourceModule,
        )
        .map(() => relative(process.cwd(), file));
    });

    expect([...new Set(offenders)]).toEqual([]);
  });

  it('keeps shared and platform independent from domain modules', () => {
    const files = [
      ...collectTypeScriptFiles(join(sourceRoot, 'shared')),
      ...collectTypeScriptFiles(join(sourceRoot, 'platform')),
    ];
    const offenders = files
      .filter((file) =>
        relativeImportTargets(file).some((target) =>
          target.startsWith(`${modulesRoot}/`),
        ),
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps shared domain and application contracts framework-independent', () => {
    const files = [
      ...collectTypeScriptFiles(join(sourceRoot, 'shared', 'domain')),
      ...collectTypeScriptFiles(join(sourceRoot, 'shared', 'application')),
    ];
    const frameworkPackages = [
      '@nestjs/',
      '@mikro-orm/',
      '@aws-sdk/',
      'ioredis',
      'express',
    ];
    const offenders = files
      .filter((file) =>
        packageImportSpecifiers(file).some((specifier) =>
          frameworkPackages.some(
            (packageName) =>
              specifier === packageName || specifier.startsWith(packageName),
          ),
        ),
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps module domain and application code independent from platform', () => {
    const platformRoot = join(sourceRoot, 'platform');
    const offenders = moduleFiles
      .filter(
        (file) => file.includes('/domain/') || file.includes('/application/'),
      )
      .filter((file) =>
        relativeImportTargets(file).some((target) =>
          target.startsWith(`${platformRoot}/`),
        ),
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps presentation DTOs as transport-local schemas', () => {
    const offenders = moduleFiles
      .filter((file) => file.includes('/presentation/'))
      .filter((file) => file.includes('/dto/') && file.endsWith('.dto.ts'))
      .filter((file) =>
        relativeImportTargets(file).some(
          (target) =>
            target.includes('/application/') ||
            target.includes('/domain/') ||
            target.includes('/infrastructure/'),
        ),
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('uses undefined instead of null for optional business values', () => {
    const files = [
      ...moduleFiles.filter((file) => !file.includes('/infrastructure/')),
      ...collectTypeScriptFiles(join(sourceRoot, 'shared')),
      ...collectTypeScriptFiles(join(process.cwd(), 'test', 'application')),
      ...collectTypeScriptFiles(join(process.cwd(), 'test', 'domain')),
      ...collectTypeScriptFiles(join(process.cwd(), 'test', 'presentation')),
    ];
    const offenders = files
      .filter((file) => containsNullValueContract(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
