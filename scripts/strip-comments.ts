import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";

interface Options {
  keepJSDoc: boolean;
  keepBlock: boolean;
  dryRun: boolean;
  check: boolean;
  format: boolean;
  formatAll: boolean;
}

interface CommentInfo {
  pos: number;
  end: number;
  kind: ts.SyntaxKind;
  text: string;
}

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
]);

const PRESERVED_PATTERNS = [
  /@ts-(?:ignore|expect-error|nocheck|check)\b/i,
  /eslint-(?:disable|enable|no-)/i,
  /eslint-env\b/i,
  /eslint\b.*(?:global|globals)/i,
  /tslint:/i,
  /prettier-ignore\b/i,
  /prettier\b.*(?:disable|enable)/i,
  /istanbul\s+ignore/i,
  /c8\s+ignore/i,
  /v8\s+ignore/i,
  /@__PURE__/,
  /@__NO_SIDE_EFFECTS__/,
  /@license\b/i,
  /@preserve\b/i,
  /SPDX-License-Identifier/i,
  /copyright/i,
  /all rights reserved/i,
  /sourceMappingURL=/i,
  /webpack[A-Z-]/i,
  /vite-ignore/i,
  /#__PURE__/,
];

function isCommentKind(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.SingleLineCommentTrivia ||
    kind === ts.SyntaxKind.MultiLineCommentTrivia
  );
}

function collectAllComments(source: string, file: string): CommentInfo[] {
  const scriptKind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const comments = new Map<string, CommentInfo>();

  function addRanges(ranges: readonly ts.CommentRange[] | undefined): void {
    if (!ranges) return;

    for (const range of ranges) {
      if (!isCommentKind(range.kind)) continue;

      const key = `${range.pos}-${range.end}`;

      if (!comments.has(key)) {
        comments.set(key, {
          pos: range.pos,
          end: range.end,
          kind: range.kind,
          text: source.slice(range.pos, range.end),
        });
      }
    }
  }

  function visit(node: ts.Node): void {
    addRanges(ts.getLeadingCommentRanges(source, node.getFullStart()));

    addRanges(ts.getTrailingCommentRanges(source, node.getEnd()));

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  addRanges(ts.getLeadingCommentRanges(source, source.length));

  return [...comments.values()].sort((a, b) => a.pos - b.pos);
}

function shouldPreserveComment(
  comment: CommentInfo,
  options: Options,
): boolean {
  const { kind, text } = comment;

  if (
    kind === ts.SyntaxKind.SingleLineCommentTrivia &&
    /^\/\/\/\s*<(?:reference|amd-module|amd-dependency)\b/i.test(text)
  ) {
    return true;
  }

  if (
    options.keepJSDoc &&
    kind === ts.SyntaxKind.MultiLineCommentTrivia &&
    text.startsWith("/**")
  ) {
    return true;
  }

  if (options.keepBlock && kind === ts.SyntaxKind.MultiLineCommentTrivia) {
    return true;
  }

  if (PRESERVED_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return false;
}

function removeComments(
  source: string,
  comments: CommentInfo[],
  options: Options,
): { content: string; removed: number } {
  const toRemove = comments.filter(
    (comment) => !shouldPreserveComment(comment, options),
  );

  let content = source;

  for (const comment of [...toRemove].sort((a, b) => b.pos - a.pos)) {
    const original = content.slice(comment.pos, comment.end);

    const replacement = original.replace(/[^\r\n]/g, " ");

    content =
      content.slice(0, comment.pos) + replacement + content.slice(comment.end);
  }

  return {
    content,
    removed: toRemove.length,
  };
}

async function formatWithPrettier(
  content: string,
  file: string,
): Promise<string> {
  const prettier = await import("prettier");

  return prettier.format(content, {
    filepath: file,
    parser: "typescript",
  });
}

async function processFile(
  file: string,
  options: Options,
): Promise<{ removed: number; changed: boolean }> {
  const source = fs.readFileSync(file, "utf8");
  const comments = collectAllComments(source, file);

  const { content: cleaned, removed } = removeComments(
    source,
    comments,
    options,
  );

  if (options.check) {
    if (removed > 0) {
      console.error(`✗ ${file}: ${removed} comentário(s) removível(is).`);
    }

    return { removed, changed: removed > 0 };
  }

  if (options.dryRun) {
    console.log(
      `[dry-run] ${file}: ${removed} comentário(s) seriam removidos.`,
    );

    return { removed, changed: false };
  }

  let result = cleaned;

  const shouldFormat = options.format && (options.formatAll || removed > 0);

  if (shouldFormat) {
    try {
      result = await formatWithPrettier(result, file);
    } catch (error) {
      throw new Error(
        `Prettier falhou em ${file}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const changed = result !== source;

  if (changed) {
    fs.writeFileSync(file, result, "utf8");

    console.log(`✓ ${file}: ${removed} comentário(s) removível(is).`);
  }

  return { removed, changed };
}

function walk(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const targets = args.filter((arg) => !arg.startsWith("--"));

  const options: Options = {
    keepJSDoc: true,
    keepBlock: flags.includes("--keep-block"),
    dryRun: flags.includes("--dry-run"),
    check: flags.includes("--check"),
    format: !flags.includes("--no-format"),
    formatAll: flags.includes("--format-all"),
  };

  if (options.check && options.dryRun) {
    throw new Error("Use --check ou --dry-run, não os dois juntos.");
  }

  if (targets.length === 0) {
    throw new Error(
      "Uso: tsx scripts/strip-comments.ts <arquivo|pasta> " +
        "[--check] [--dry-run] [--keep-block] " +
        "[--no-format] [--format-all]",
    );
  }

  const files: string[] = [];

  for (const target of targets) {
    const resolved = path.resolve(target);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Caminho não encontrado: ${target}`);
    }

    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      files.push(...walk(resolved));
    } else if (stat.isFile()) {
      files.push(resolved);
    }
  }

  const uniqueFiles = [...new Set(files)];

  let totalRemoved = 0;
  let filesChanged = 0;
  let hasViolations = false;

  for (const file of uniqueFiles) {
    const result = await processFile(file, options);

    totalRemoved += result.removed;

    if (result.changed && !options.check) {
      filesChanged++;
    }

    if (options.check && result.changed) {
      hasViolations = true;
    }
  }

  console.log(
    `\nTotal: ${totalRemoved} comentário(s) removível(is) ` +
      `em ${uniqueFiles.length} arquivo(s).`,
  );

  if (!options.check) {
    console.log(`Arquivos alterados: ${filesChanged}.`);
  }

  if (hasViolations) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("Erro:", error instanceof Error ? error.message : error);

  process.exitCode = 1;
});
