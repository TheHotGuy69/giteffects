import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { Player } from '../playback/player';

function resolveGitDir(root: string): string | undefined {
  const dotGit = path.join(root, '.git');
  try {
    if (fs.statSync(dotGit).isDirectory()) {
      return dotGit;
    }
    const content = fs.readFileSync(dotGit, 'utf8');
    const m = content.match(/^gitdir:\s*(.+?)\s*$/m);
    if (m) {
      return path.resolve(root, m[1]);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function trailing(fn: () => void, ms: number): () => void {
  let t: NodeJS.Timeout | undefined;
  return () => {
    if (t) {
      clearTimeout(t);
    }
    t = setTimeout(fn, ms);
  };
}

export class GitWatcher implements vscode.Disposable {
  private watchers = new Map<string, fs.FSWatcher[]>();
  private lastReflogMsg = '';
  private lastReflogLine = '';
  private conflictActive = false;
  private knownRemotes = new Map<string, string>();

  constructor(private player: Player, private isTerminalBusy: () => boolean = () => false) {}

  public activate(root: string): void {
    if (this.watchers.has(root)) {
      return;
    }
    const gitDir = resolveGitDir(root);
    if (!gitDir) {
      return;
    }
    const list: fs.FSWatcher[] = [];
    this.watchers.set(root, list);

    const add = (target: string, opts: fs.WatchOptions, cb: () => void) => {
      try {
        const w = fs.watch(target, { persistent: false, ...opts }, cb);
        w.on('error', () => {});
        list.push(w);
      } catch {
        // folder missing or watch limit reached
      }
    };

    const logsDir = path.join(gitDir, 'logs');
    const logsHead = path.join(logsDir, 'HEAD');

    if (fs.existsSync(logsHead)) {
      let lastLine = this.readLastLine(logsHead);
      this.lastReflogLine = lastLine;
      this.lastReflogMsg = lastLine.split('\t').slice(1).join('\t');
      add(logsDir, {}, trailing(() => {
        const line = this.readLastLine(logsHead);
        if (!line || line === this.lastReflogLine) {
          return;
        }
        this.lastReflogLine = line;
        this.lastReflogMsg = line.split('\t').slice(1).join('\t');
        if (!this.isTerminalBusy() && /^commit(?: \((?:amend|initial|merge)\))?:/.test(this.lastReflogMsg)) {
          void this.player.play('commit.mp3');
        }
      }, 400));
    } else if (fs.existsSync(logsDir)) {
      add(logsDir, {}, trailing(() => {
        if (fs.existsSync(logsHead)) {
          const line = this.readLastLine(logsHead);
          if (line && line !== this.lastReflogLine) {
            this.lastReflogLine = line;
            this.lastReflogMsg = line.split('\t').slice(1).join('\t');
            if (!this.isTerminalBusy() && /^commit(?: \((?:amend|initial|merge)\))?:/.test(this.lastReflogMsg)) {
              void this.player.play('commit.mp3');
            }
          }
        }
      }, 400));
    }

    const refsRemotes = path.join(gitDir, 'refs', 'remotes');
    if (fs.existsSync(refsRemotes)) {
      this.knownRemotes = this.readRemoteShas(gitDir);
      add(refsRemotes, { recursive: true }, trailing(() => {
        if (this.isTerminalBusy()) {
          return;
        }
        const now = this.readRemoteShas(gitDir);
        const head = this.readHeadSha(gitDir);
        let moved = false;
        for (const [k, sha] of now) {
          if (this.knownRemotes.get(k) !== sha && head && sha === head) {
            moved = true;
            break;
          }
        }
        this.knownRemotes = now;
        if (moved && !/^(?:pull|merge|checkout|clone|fetch|rebase)/.test(this.lastReflogMsg)) {
          void this.player.play('push.mp3');
        }
      }, 400));
    }

    add(gitDir, {}, trailing(() => {
      const busyOp = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']
        .some((n) => fs.existsSync(path.join(gitDir, n)));
      if (!busyOp) {
        this.conflictActive = false;
        return;
      }
      if (this.conflictActive) {
        return;
      }
      execFile('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: root, windowsHide: true }, (err, stdout) => {
        if (!err && stdout.trim() && !this.conflictActive) {
          this.conflictActive = true;
          void this.player.play('merge_conflict.mp3');
        }
      });
    }, 400));
  }

  public deactivate(root: string): void {
    this.watchers.get(root)?.forEach((w) => w.close());
    this.watchers.delete(root);
  }

  public dispose(): void {
    for (const root of [...this.watchers.keys()]) {
      this.deactivate(root);
    }
  }

  private readLastLine(file: string): string {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      return lines[lines.length - 1] ?? '';
    } catch {
      return '';
    }
  }

  private readHeadSha(gitDir: string): string | undefined {
    try {
      const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      const m = head.match(/^ref: (.+)$/);
      if (m) {
        return fs.readFileSync(path.join(gitDir, m[1]), 'utf8').trim();
      }
      return head;
    } catch {
      return undefined;
    }
  }

  private readRemoteShas(gitDir: string): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (dir: string, prefix: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(p, prefix + e.name + '/');
        } else if (e.name !== 'HEAD') {
          try {
            out.set(prefix + e.name, fs.readFileSync(p, 'utf8').trim());
          } catch {
            // ignore
          }
        }
      }
    };
    const remotes = path.join(gitDir, 'refs', 'remotes');
    if (fs.existsSync(remotes)) {
      walk(remotes, '');
    }
    return out;
  }
}
