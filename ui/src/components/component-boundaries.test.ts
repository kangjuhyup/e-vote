import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(import.meta.dirname, "..");
const componentsRoot = path.join(srcRoot, "components");
const featuresRoot = path.join(srcRoot, "features");

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  });
}

describe("component boundaries", () => {
  it("keeps components independent from feature modules", () => {
    const componentSourceFiles = walkFiles(componentsRoot).filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath),
    );

    const offenders = componentSourceFiles.filter((filePath) =>
      /from\s+["']@\/features\//.test(readFileSync(filePath, "utf8")),
    );

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("does not mirror feature slice names inside the component tree", () => {
    const featureNames = readdirSync(featuresRoot).filter((entry) =>
      statSync(path.join(featuresRoot, entry)).isDirectory(),
    );

    const mirroredComponentFolders = featureNames.filter((featureName) =>
      existsSync(path.join(componentsRoot, featureName)),
    );

    expect(mirroredComponentFolders).toEqual([]);
  });

  it("keeps feature React files inside feature container folders only", () => {
    const featureReactFiles = walkFiles(featuresRoot).filter((filePath) =>
      /\.(tsx|jsx)$/.test(filePath),
    );

    const offenders = featureReactFiles.filter((filePath) => {
      const relativePath = path.relative(featuresRoot, filePath);

      return !relativePath.split(path.sep).includes("container");
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature-to-component imports inside feature container folders only", () => {
    const featureSourceFiles = walkFiles(featuresRoot).filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath),
    );

    const offenders = featureSourceFiles.filter((filePath) => {
      const relativePath = path.relative(featuresRoot, filePath);
      const isContainerFile = relativePath.split(path.sep).includes("container");
      const importsComponents = /from\s+["']@\/components\//.test(
        readFileSync(filePath, "utf8"),
      );

      return importsComponents && !isContainerFile;
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });
});
