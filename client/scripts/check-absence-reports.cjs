const { spawnSync } = require('node:child_process');
const { mkdtempSync, realpathSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, delimiter, dirname, join, resolve } = require('node:path');

const clientRoot = resolve(__dirname, '..');
const tempRoot = realpathSync(tmpdir());
const outputDir = mkdtempSync(join(tempRoot, 'erp-absence-report-tests-'));

try {
  const compile = spawnSync(process.execPath, [
    require.resolve('typescript/bin/tsc'), 'scripts/absenceReport.spec.ts',
    '--outDir', outputDir, '--rootDir', '.', '--module', 'commonjs',
    '--moduleResolution', 'node', '--esModuleInterop', '--target', 'ES2020',
    '--lib', 'ES2020,DOM', '--types', 'node', '--skipLibCheck',
  ], { cwd: clientRoot, stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status || 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', join(outputDir, 'scripts/absenceReport.spec.js')], {
      cwd: clientRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_PATH: [
        join(clientRoot, 'node_modules'), resolve(clientRoot, '../node_modules'), process.env.NODE_PATH,
      ].filter(Boolean).join(delimiter) },
    });
    process.exitCode = tests.status || (tests.error ? 1 : 0);
  }
} finally {
  // Usuwamy wyłącznie własny katalog tymczasowy z wynikami kompilacji testów.
  const target = realpathSync(outputDir);
  if (dirname(target) === tempRoot && basename(target).startsWith('erp-absence-report-tests-')) {
    rmSync(target, { recursive: true, force: true });
  }
}
