import {
  Project,
  SyntaxKind,
  CallExpression,
  SourceFile,
  Node,
  Scope,
} from "ts-morph";
import * as readline from "readline";

interface Occurrence {
  sourceFile: SourceFile;
  call: CallExpression;
  method: string;
  line: number;
  text: string;
  isSensitive: boolean;
  inline: boolean;
  enclosingClass?: string;
}

interface Stats {
  substituted: number;
  removed: number;
  kept: number;
  filesChanged: Set<string>;
}

const stats: Stats = {
  substituted: 0,
  removed: 0,
  kept: 0,
  filesChanged: new Set(),
};

const SENSITIVE_PATTERN = /password|plainPassword|secret|token|hash/i;
const METHODS = ["log", "error", "warn", "debug", "info", "trace"];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const targets = args.filter((a) => !a.startsWith("--"));

const DRY_RUN = flags.has("--dry-run");
const AUTO_REMOVE_SENSITIVE = flags.has("--remove-sensitive");
const YES_TO_ALL = flags.has("--yes");
const GLOB = targets[0] ?? "src/**/*.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function findEnclosingClass(node: Node): string | undefined {
  let cur: Node | undefined = node;
  while (cur) {
    if (Node.isClassDeclaration(cur)) return cur.getName();
    cur = cur.getParent();
  }
  return undefined;
}

function hasLoggerProperty(sourceFile: SourceFile, className: string): boolean {
  const cls = sourceFile.getClass(className);
  if (!cls) return false;

  if (cls.getProperties().some((p) => p.getName() === "logger")) return true;

  const ctor = cls.getConstructors()[0];
  if (ctor) {
    for (const param of ctor.getParameters()) {
      if (param.getName() === "logger") return true;
      if (param.getScope() !== undefined && param.getName() === "logger")
        return true;
    }
  }

  return false;
}

function hasLoggerImport(sourceFile: SourceFile): boolean {
  return sourceFile
    .getImportDeclarations()
    .some(
      (imp) =>
        imp.getModuleSpecifierValue() === "@nestjs/common" &&
        imp.getNamedImports().some((n) => n.getName() === "Logger"),
    );
}

function hasNestCommonImport(sourceFile: SourceFile): boolean {
  return sourceFile
    .getImportDeclarations()
    .some((imp) => imp.getModuleSpecifierValue() === "@nestjs/common");
}

function addLoggerImport(sourceFile: SourceFile): void {
  if (hasLoggerImport(sourceFile)) return;

  const nestImport = sourceFile
    .getImportDeclarations()
    .find((imp) => imp.getModuleSpecifierValue() === "@nestjs/common");

  if (nestImport) {
    nestImport.addNamedImport("Logger");
  } else {
    sourceFile.addImportDeclaration({
      moduleSpecifier: "@nestjs/common",
      namedImports: ["Logger"],
    });
  }
}

function addLoggerProperty(sourceFile: SourceFile, className: string): void {
  const cls = sourceFile.getClass(className);
  if (!cls) return;
  if (hasLoggerProperty(sourceFile, className)) return;

  cls.insertProperty(0, {
    name: "logger",
    isReadonly: true,
    scope: Scope.Private,
    type: "Logger",
    initializer: `new Logger(${className}.name)`,
  });
}

function isInline(call: CallExpression): boolean {
  const text = call.getSourceFile().getFullText();
  const start = call.getStart();
  const end = call.getEnd();

  const lineStart = text.lastIndexOf("\n", start) + 1;

  const lineEndIdx = text.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;

  const before = text.slice(lineStart, start).trim();

  const after = text.slice(end, lineEnd).trim();

  const stripTerminators = (s: string) =>
    s.replace(/^[;,\)\]\}\s]+/, "").trim();

  return (
    stripTerminators(before).length > 0 || stripTerminators(after).length > 0
  );
}

function isSensitive(call: CallExpression): boolean {
  const args = call.getArguments().map((a) => a.getText());
  return args.some((a) => SENSITIVE_PATTERN.test(a));
}

function collectOccurrences(project: Project): Occurrence[] {
  const occurrences: Occurrence[] = [];

  for (const sourceFile of project.getSourceFiles(GLOB)) {
    sourceFile.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      const expr = node.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) return;

      const obj = expr.getExpression().getText();
      const method = expr.getName();
      if (obj !== "console") return;
      if (!METHODS.includes(method)) return;

      occurrences.push({
        sourceFile,
        call: node,
        method,
        line: node.getStartLineNumber(),
        text: node.getText(),
        isSensitive: isSensitive(node),
        inline: isInline(node),
        enclosingClass: findEnclosingClass(node),
      });
    });
  }

  return occurrences;
}

function substitute(occ: Occurrence): void {
  const { call, sourceFile, enclosingClass } = occ;
  if (!enclosingClass) {
    console.log(`  ⚠️  não achei classe envolvente — pulando`);
    return;
  }

  const alreadyHasLogger = hasLoggerProperty(sourceFile, enclosingClass);

  if (!alreadyHasLogger) {
    addLoggerImport(sourceFile);
    addLoggerProperty(sourceFile, enclosingClass);
  }

  const expr = call.getExpression();
  if (Node.isPropertyAccessExpression(expr)) {
    expr.getExpression().replaceWithText("this.logger");
  }
  stats.substituted++;
  stats.filesChanged.add(sourceFile.getFilePath());
}

function removeLine(occ: Occurrence): void {
  const { call, sourceFile } = occ;
  if (occ.inline) {
    console.log(
      `  ⚠️  console inline — remover a linha inteira apagaria código. Use 's' ou 'k'.`,
    );
    return;
  }
  const line = call.getStartLineNumber();
  const stmt = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
  if (!stmt) {
    console.log(
      `  ⚠️  não achei ExpressionStatement — pulando (linha ${line})`,
    );
    return;
  }
  stmt.remove();
  stats.removed++;
  stats.filesChanged.add(sourceFile.getFilePath());
  console.log(`  ✓ linha ${line} removida`);
}

async function main() {
  console.log(`\n🔍 Analisando ${GLOB}...\n`);
  const project = new Project({ tsConfigFilePath: "tsconfig.json" });
  const occurrences = collectOccurrences(project);

  if (occurrences.length === 0) {
    console.log("✅ Nenhum console.* encontrado.\n");
    rl.close();
    return;
  }

  console.log(`📋 ${occurrences.length} console.* encontrado(s)\n`);

  const byFile = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const key = occ.sourceFile.getFilePath();
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(occ);
  }

  const files = [...byFile.keys()].sort();
  console.log(`📁 ${files.length} arquivo(s) afetado(s):\n`);
  for (const f of files) {
    console.log(
      `  - ${f.replace(process.cwd() + "/", "")} (${byFile.get(f)!.length})`,
    );
  }
  console.log("");

  if (DRY_RUN) {
    for (const f of files) {
      console.log(`\n📄 ${f.replace(process.cwd() + "/", "")}`);
      for (const occ of byFile.get(f)!) {
        const badge = occ.isSensitive
          ? "🔴 SENSÍVEL"
          : occ.inline
            ? "⚠️  inline"
            : "○";
        console.log(`  ${badge} linha ${occ.line}: ${occ.text.slice(0, 80)}`);
      }
    }
    console.log("\n(dry-run — nada foi alterado)\n");
    rl.close();
    return;
  }

  let quit = false;
  let applyToFile: string | null = null;

  for (const f of files) {
    if (quit) break;
    const shortName = f.replace(process.cwd() + "/", "");
    console.log(`\n📄 ${shortName}`);

    for (const occ of byFile.get(f)!) {
      if (quit) break;

      const isFileWide = applyToFile === f;
      const badge = occ.isSensitive
        ? "🔴 SENSÍVEL"
        : occ.inline
          ? "⚠️  inline"
          : "○";

      console.log(`\n  ${badge} linha ${occ.line} [${occ.method}]:`);
      console.log(`    ${occ.text.slice(0, 120)}`);

      if (occ.isSensitive && AUTO_REMOVE_SENSITIVE) {
        removeLine(occ);
        continue;
      }

      if (YES_TO_ALL) {
        if (occ.isSensitive) removeLine(occ);
        else substitute(occ);
        continue;
      }

      let action: string;
      if (isFileWide) {
        action = occ.isSensitive ? "r" : "s";
      } else {
        const actions: Record<string, string> = occ.isSensitive
          ? { r: "Remover linha", a: "Aplicar ao arquivo" }
          : {
              s: "Substituir por logger",
              r: "Remover linha",
              a: "Aplicar ao arquivo",
            };

        const valid = Object.keys(actions);
        const prompt = `  ${valid.map((k) => `[${k}] ${actions[k]}`).join(" ou ")}: `;

        while (true) {
          const input = (await ask(prompt)).trim().toLowerCase();
          if (valid.includes(input)) {
            action = input;
            break;
          }
          console.log(
            `\n  ❌ Ação inválida '${input}'. \n  ⮚  Use: ${valid.map((k) => `[${k}] para ${actions[k]}`).join(" ou ")}\n`,
          );
        }
      }

      switch (action) {
        case "s":
          if (occ.isSensitive) {
            console.log(
              `  🚫 não posso substituir senha por logger — use 'r' para remover`,
            );
          } else {
            substitute(occ);
            console.log(`  ✓ substituído`);
          }
          break;
        case "r":
          removeLine(occ);
          break;
        case "a":
          applyToFile = f;
          if (occ.isSensitive) removeLine(occ);
          else substitute(occ);
          break;
      }
    }
  }

  if (!DRY_RUN && stats.filesChanged.size > 0) {
    console.log("\n💾 Salvando arquivos...");
    for (const f of stats.filesChanged) {
      const sf = project.getSourceFile(f);
      if (sf) sf.saveSync();
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Relatório final");
  console.log("=".repeat(60));
  console.log(`  ✅ Substituídos por logger: ${stats.substituted}`);
  console.log(`  🗑️  Removidos:              ${stats.removed}`);
  console.log(`  ⏭️  Mantidos:               ${stats.kept}`);
  console.log(`  📁 Arquivos alterados:     ${stats.filesChanged.size}`);
  if (DRY_RUN) console.log("  (dry-run — nada foi salvo)");
  console.log("");

  rl.close();
}

main().catch((err) => {
  console.error("💥 Erro:", err);
  rl.close();
  process.exit(1);
});
