import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Player } from '../playback/player';

export class GitWatcher {
  private watchers: fs.FSWatcher[] = [];
  private lastCommitTime = 0;
  private lastPushTime = 0;
  private lastConflictTime = 0;
  private readonly DEBOUNCE_MS = 500;

  constructor(private player: Player) {}

  public activate(workspaceRoot: string): void {
    const gitDir = path.join(workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return;
    }

    const logsHead = path.join(gitDir, 'logs', 'HEAD');
    if (fs.existsSync(logsHead)) {
      this.watchers.push(
        fs.watch(logsHead, { persistent: false }, () => {
          const now = Date.now();
          if (now - this.lastCommitTime > this.DEBOUNCE_MS) {
            this.lastCommitTime = now;
            void this.player.play('commit.mp3');
          }
        })
      );
    }

    const refsRemotes = path.join(gitDir, 'refs', 'remotes');
    if (fs.existsSync(refsRemotes)) {
      this.watchers.push(
        fs.watch(refsRemotes, { recursive: true, persistent: false }, () => {
          const now = Date.now();
          if (now - this.lastPushTime > this.DEBOUNCE_MS) {
            this.lastPushTime = now;
            void this.player.play('push.mp3');
          }
        })
      );
    }

    const mergeHead = path.join(gitDir, 'MERGE_HEAD');
    if (fs.existsSync(mergeHead)) {
      this.watchers.push(
        fs.watch(mergeHead, { persistent: false }, (eventType) => {
          if (eventType === 'rename' || eventType === 'change') {
            const now = Date.now();
            if (now - this.lastConflictTime > this.DEBOUNCE_MS) {
              this.lastConflictTime = now;
              void this.player.play('merge_conflict.mp3');
            }
          }
        })
      );
    }
  }

  public dispose(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }
}
