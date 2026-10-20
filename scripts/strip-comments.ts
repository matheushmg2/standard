import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface Options {
  keepJSDoc: boolean;
  keepBlock: boolean;
  dryRun: boolean;
}

/**
 * Coleta TODOS os comentários do arquivo, incluindo:
 * - leading/trailing de nós (statements, declarações)
 * - comentários "soltos" entre tokens (inline em arrays, objetos, args)
 * - comentários órfãos no final do arquivo
 *
 * Estratégia:
 * 1) forEachChild + leading/trailing (rápido, cobre 90%)
 * 2) Varredura bruta posição-a-posição (garante 100%, custo O(n²) aceitável)
 * 3) Fim do arquivo (órfãos)
 */
function collectAllComments(source: string, sourceFile: ts.SourceFile): ts.CommentRange[] {
  const seen = new Set<string>();
  const comments: ts.CommentRange[] = [];

  const addRanges = (ranges: ts.CommentRange[] | undefined) => {
    if (!ranges) return;
    for (const r of ranges) {
      const key = `${r.pos}-${r.end}`;
      if (!seen.has(key)) {
        seen.add(key);
        comments.push(r);
      }
    }
  };

  // 1) Comentários leading/trailing de cada nó
  const visitNode = (node: ts.Node) => {
    addRanges(ts.getLeadingCommentRanges(source, node.getFullStart()));
    addRanges(ts.getTrailingCommentRanges(source, node.getEnd()));
    ts.forEachChild(node, visitNode);
  };
  visitNode(sourceFile);

  // 2) Comentários órfãos no final
  addRanges(ts.getLeadingCommentRanges(source, source.length));

  // 3) SCANNER: varre token por token e pega comentários que o forEachChild não vê.
  //    O scanner SABE quando está dentro de string/template/regex, então não confunde
  //    'http://...' com comentário.
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false,
    ts.LanguageVariant.Standard,
    source,
  );

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenPos = scanner.getTokenPos();
    addRanges(ts.getLeadingCommentRanges(source, tokenPos));
    token = scanner.scan();
  }

  return comments;
}

function stripComments(file: string, options: Options): { removed: number; content: string } {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const allComments = collectAllComments(source, sourceFile);

  // Filtra por tipo
  const toRemove = allComments.filter((c) => {
    if (c.kind === ts.SyntaxKind.SingleLineCommentTrivia) return true;
    if (c.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      if (options.keepBlock) return false;
      if (options.keepJSDoc) {
        const text = source.slice(c.pos, c.end);
        if (text.startsWith('/**')) return false; // preserva JSDoc
      }
      return true;
    }
    return false;
  });

  // Remove de trás pra frente (não invalida posições)
  let result = source;
  toRemove
    .sort((a, b) => b.pos - a.pos)
    .forEach((c) => {
      result = result.slice(0, c.pos) + result.slice(c.end);
    });

  // Limpa linhas em branco duplicadas deixadas pela remoção
  result = result.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  return { removed: toRemove.length, content: result };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

// ===== CLI =====
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const targets = args.filter((a) => !a.startsWith('--'));

const options: Options = {
  keepJSDoc: !flags.includes('--no-jsdoc'),   // padrão: preserva JSDoc
  keepBlock: flags.includes('--keep-block'),  // padrão: remove /* */
  dryRun: flags.includes('--dry-run'),
};

if (targets.length === 0) {
  console.error('Uso: ts-node scripts/strip-comments.ts <arquivo|pasta> [--dry-run] [--no-jsdoc] [--keep-block]');
  process.exit(1);
}

const files: string[] = [];
for (const t of targets) {
  if (fs.statSync(t).isDirectory()) files.push(...walk(t));
  else files.push(t);
}

let totalRemoved = 0;
for (const file of files) {
  const { removed, content } = stripComments(file, options);
  totalRemoved += removed;

  if (options.dryRun) {
    console.log(`[dry-run] ${file}: ${removed} comentário(s) seriam removidos`);
  } else if (removed > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ ${file}: ${removed} comentário(s) removido(s)`);
  }
}

console.log(`\nTotal: ${totalRemoved} comentário(s) em ${files.length} arquivo(s).`);