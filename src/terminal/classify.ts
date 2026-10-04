export function splitCommands(cmd: string): string[] {
  return cmd.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function stripPrefix(cmd: string): string {
  let s = cmd.trim();
  if (s.startsWith('sudo ')) {
    s = s.slice(5).trim();
  }
  const m = s.match(/^git\s+-C\s+\S+\s+/);
  if (m) {
    s = s.slice(m[0].length);
  }
  if (!s.startsWith('git ')) {
    s = 'git ' + s;
  }
  return s;
}

export function classifySuccess(cmd: string): string | null {
  const parts = splitCommands(cmd);
  let best: string | null = null;
  const priority: Record<string, number> = { delete_branch: 4, reset: 3, force_push: 2, push: 1, commit: 0 };
  for (const raw of parts) {
    const s = stripPrefix(raw);
    let matched: string | null = null;
    if (/^git\s+branch\s+.*-(?:d|D|--delete)\b/.test(s)) {
      matched = 'delete_branch';
    } else if (/^git\s+reset\s+--hard\b/.test(s)) {
      matched = 'reset';
    } else if (/^git\s+push\b/.test(s) && /-(?:f|force|force-with-lease)(?:=\S*)?\b/.test(s)) {
      matched = 'force_push';
    } else if (/^git\s+push\b/.test(s)) {
      matched = 'push';
    } else if (/^git\s+commit\b/.test(s)) {
      matched = 'commit';
    }
    if (matched && (!best || priority[matched] > priority[best])) {
      best = matched;
    }
  }
  return best;
}

const CONFLICT_RE = /\b(?:merge|pull|rebase|cherry-pick|revert|am|apply|checkout|switch|stash\s+pop|stash\s+apply)\b/i;
const TEST_RE = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test|npx\s+(?:jest|vitest|mocha)|jest|vitest|mocha|pytest|phpunit|rspec|go\s+test|cargo\s+test|dotnet\s+test|mvn\s+test|gradlew?\s+test|python\d?\s+-m\s+(?:pytest|unittest))\b/i;

export function classifyFailure(cmd: string): 'maybe_conflict' | 'tests_fail' | 'terminal_fail' {
  const parts = splitCommands(cmd);
  let isConflict = false;
  let isTest = false;
  for (const raw of parts) {
    const s = stripPrefix(raw);
    if (CONFLICT_RE.test(s)) {
      isConflict = true;
    }
    if (TEST_RE.test(s)) {
      isTest = true;
    }
  }
  if (isConflict) {
    return 'maybe_conflict';
  }
  if (isTest) {
    return 'tests_fail';
  }
  return 'terminal_fail';
}
