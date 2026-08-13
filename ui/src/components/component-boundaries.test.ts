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

function isFeatureDirectory(entryPath: string) {
  return statSync(entryPath).isDirectory();
}

function getFeatureNames() {
  return readdirSync(featuresRoot).filter((entry) =>
    isFeatureDirectory(path.join(featuresRoot, entry)),
  );
}

function getFeatureRelativePath(filePath: string) {
  return path.relative(featuresRoot, filePath);
}

function getFeatureLayer(filePath: string) {
  return getFeatureRelativePath(filePath).split(path.sep)[1] ?? "";
}

function isFeatureLayer(filePath: string, layer: string) {
  return getFeatureLayer(filePath) === layer;
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
    const featureNames = getFeatureNames();

    const mirroredComponentFolders = featureNames.filter((featureName) =>
      existsSync(path.join(componentsRoot, featureName)),
    );

    expect(mirroredComponentFolders).toEqual([]);
  });

  it("keeps feature React files inside feature container or ui folders only", () => {
    const featureReactFiles = walkFiles(featuresRoot).filter((filePath) =>
      /\.(tsx|jsx)$/.test(filePath),
    );

    const offenders = featureReactFiles.filter((filePath) => {
      return !isFeatureLayer(filePath, "container") && !isFeatureLayer(filePath, "ui");
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature container folders limited to container entry files", () => {
    const containerFiles = walkFiles(featuresRoot).filter((filePath) =>
      isFeatureLayer(filePath, "container"),
    );

    const offenders = containerFiles.filter((filePath) => {
      const fileName = path.basename(filePath);

      return !fileName.endsWith("-container.tsx") && !/\.test\.tsx?$/.test(fileName);
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature-to-component imports inside feature container or ui folders only", () => {
    const featureSourceFiles = walkFiles(featuresRoot).filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath),
    );

    const offenders = featureSourceFiles.filter((filePath) => {
      const isContainerOrUiFile =
        isFeatureLayer(filePath, "container") || isFeatureLayer(filePath, "ui");
      const importsComponents = /from\s+["']@\/components\//.test(
        readFileSync(filePath, "utf8"),
      );

      return importsComponents && !isContainerOrUiFile;
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature ui components free of data wiring imports", () => {
    const featureUiFiles = walkFiles(featuresRoot).filter(
      (filePath) => /\.(ts|tsx)$/.test(filePath) && isFeatureLayer(filePath, "ui"),
    );

    const wiringImportPattern =
      /from\s+["'](?:@tanstack\/react-query|zustand|@\/features\/[^/]+\/(?:api|store)\/|@\/features\/[^/]+\/model\/[^"']*selectors|.*\/(?:api|store)\/|.*\/model\/[^"']*selectors)/;

    const offenders = featureUiFiles.filter((filePath) =>
      wiringImportPattern.test(readFileSync(filePath, "utf8")),
    );

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature lib files free of React component imports", () => {
    const featureLibFiles = walkFiles(featuresRoot).filter(
      (filePath) => /\.(ts|tsx)$/.test(filePath) && isFeatureLayer(filePath, "lib"),
    );

    const offenders = featureLibFiles.filter((filePath) =>
      /from\s+["']@\/components\//.test(readFileSync(filePath, "utf8")),
    );

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature view-model mappers outside container folders", () => {
    const containerFiles = walkFiles(featuresRoot).filter((filePath) =>
      isFeatureLayer(filePath, "container"),
    );

    const offenders = containerFiles.filter((filePath) =>
      path.basename(filePath).includes("view-model"),
    );

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("has no top-level shared container directory", () => {
    const sharedContainerDirectory = path.join(srcRoot, "containers");

    expect(existsSync(sharedContainerDirectory)).toBe(false);
  });

  it("keeps app routes pointed at feature containers", () => {
    const appRoot = path.join(srcRoot, "app");
    const appSourceFiles = walkFiles(appRoot).filter((filePath) =>
      /\.(ts|tsx)$/.test(filePath),
    );

    const offenders = appSourceFiles.filter((filePath) =>
      /from\s+["']@\/features\/[^/]+\/ui\//.test(readFileSync(filePath, "utf8")),
    );

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });

  it("keeps feature containers pointed at feature ui for page composition", () => {
    const containerFiles = walkFiles(featuresRoot).filter(
      (filePath) =>
        /\.(ts|tsx)$/.test(filePath) && isFeatureLayer(filePath, "container"),
    );

    const offenders = containerFiles.filter((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const importsSiblingContainerComponent =
        /from\s+["']\.\/(?!.*-container(?:\.|["']))/.test(source);

      return importsSiblingContainerComponent;
    });

    expect(offenders.map((filePath) => path.relative(srcRoot, filePath))).toEqual(
      [],
    );
  });
});
