import * as vscode from 'vscode';
import { Player } from '../playback/player';

const GIT_TERMINAL_EVENTS: Record<string, string> = {
  'git commit': 'commit.mp3',
  'git push': 'push.mp3',
};

export class TerminalShellEvents {
  private disposables: vscode.Disposable[] = [];
  private lastTerminalFailTime = 0;
  private lastTerminalGitTime = 0;
  private readonly DEBOUNCE_MS = 500;

  constructor(private player: Player) {}

  public activate(): void {
    const shellIntegration = (vscode.window as any).onDidEndTerminalShellExecution;
    if (!shellIntegration) {
      return;
    }

    this.disposables.push(
      shellIntegration((e: any) => {
        if (!e || e.exitCode === undefined) {
          return;
        }

        if (e.exitCode !== 0) {
          const now = Date.now();
          if (now - this.lastTerminalFailTime > this.DEBOUNCE_MS) {
            this.lastTerminalFailTime = now;
            void this.player.play('terminal_fail.mp3');
          }
        }

        const commandLine = e.commandLine || '';
        const trimmed = commandLine.trim().toLowerCase();
        for (const [cmd, sound] of Object.entries(GIT_TERMINAL_EVENTS)) {
          if (trimmed === cmd || trimmed.startsWith(cmd + ' ')) {
            const now = Date.now();
            if (now - this.lastTerminalGitTime > this.DEBOUNCE_MS) {
              this.lastTerminalGitTime = now;
              void this.player.play(sound);
            }
            break;
          }
        }
      })
    );
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
