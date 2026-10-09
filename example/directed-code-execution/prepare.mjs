import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const entry = fileURLToPath(import.meta.resolve('agentic-report'));
const root = resolve(dirname(entry), '../..');
const helper = resolve(root, 'examples/directed-code-execution/prepare.mjs');
if (!existsSync(helper)) throw new Error('Use a coordinated Report build with the real-code example.');
const output = resolve('report.md');
if (existsSync(output) && !process.argv.includes('--refresh')) {
  console.log('Existing report.md kept. Use --refresh to regenerate its real excerpts.');
} else {
  const run = spawnSync(process.execPath, [helper, output], { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status ?? 1);
  console.log('report.md contains current complete methods and their actual returned values.');
}
