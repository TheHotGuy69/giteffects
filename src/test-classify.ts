import { classifySuccess, classifyFailure } from './terminal/classify';

const cases: { input: string; expected: string | null; fn: string }[] = [
  { input: 'git commit -m "x"', expected: 'commit', fn: 'classifySuccess' },
  { input: 'git add . && git commit -m x && git push', expected: 'push', fn: 'classifySuccess' },
  { input: 'git push --force origin main', expected: 'force_push', fn: 'classifySuccess' },
  { input: 'git push -f', expected: 'force_push', fn: 'classifySuccess' },
  { input: 'git push --force-with-lease', expected: 'force_push', fn: 'classifySuccess' },
  { input: 'git push origin main', expected: 'push', fn: 'classifySuccess' },
  { input: 'git reset --hard HEAD~1', expected: 'reset', fn: 'classifySuccess' },
  { input: 'git reset --soft HEAD~1', expected: null, fn: 'classifySuccess' },
  { input: 'git branch -D old', expected: 'delete_branch', fn: 'classifySuccess' },
  { input: 'git branch -a', expected: null, fn: 'classifySuccess' },
  { input: 'git -C repo commit -m a', expected: 'commit', fn: 'classifySuccess' },
  { input: 'ls', expected: null, fn: 'classifySuccess' },
];

const failCases: { input: string; expected: 'maybe_conflict' | 'tests_fail' | 'terminal_fail'; fn: string }[] = [
  { input: 'npm test', expected: 'tests_fail', fn: 'classifyFailure' },
  { input: 'pytest -x', expected: 'tests_fail', fn: 'classifyFailure' },
  { input: 'git merge dev', expected: 'maybe_conflict', fn: 'classifyFailure' },
  { input: 'git pull', expected: 'maybe_conflict', fn: 'classifyFailure' },
  { input: 'node app.js', expected: 'terminal_fail', fn: 'classifyFailure' },
  { input: 'go test ./...', expected: 'tests_fail', fn: 'classifyFailure' },
];

let failed = false;
for (const c of cases) {
  const result = classifySuccess(c.input);
  if (result !== c.expected) {
    console.error(`FAIL classifySuccess("${c.input}") => ${result} (expected ${c.expected})`);
    failed = true;
  }
}
for (const c of failCases) {
  const result = classifyFailure(c.input);
  if (result !== c.expected) {
    console.error(`FAIL classifyFailure("${c.input}") => ${result} (expected ${c.expected})`);
    failed = true;
  }
}
if (!failed) {
  console.log('All classify tests passed');
  process.exit(0);
} else {
  process.exit(1);
}
