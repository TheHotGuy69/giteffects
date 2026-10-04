import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { Player } from '../playback/player';
import { classifySuccess, classifyFailure } from './classify';

interface ShellExecution {
  commandLine: { value: string };
  cwd?: vscode.Uri;
}

interface TerminalShellExecutionEndEvent {
  execution: { commandLine: { value: string }; cwd?: vscode.Uri };
  exitCode: number | undefined;
}

export class TerminalShellEvents {
  private disposables: vscode.Disposable[] = [];
  private running = new Map<number, { cmd: string; cwd: vscode.Uri | undefined }>();
  private busyCount = 0;

  constructor(private player: Player) {}

  public activate(): void {
    const api = (vscode.window as any).onDidEndTerminalShellExecution;
    if (typeof api !== 'function') {
      this.player.log('Terminal shell integration API not available');
      return;
    }
    this.disposables.push(
      api((e: TerminalShellExecutionEndEvent) => {
        if (!e || e.exitCode === undefined || e.exitCode === 130) {
          this.removeRunning(e);
          return;
        }
        const cmd = e.execution.commandLine.value.trim();
        if (e.exitCode === 0) {
          const sound = classifySuccess(cmd);
          if (sound) {
            void this.player.play(sound);
          }
        } else {
          const failure = classifyFailure(cmd);
          const cwdPath = e.execution.cwd?.fsPath;
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          const cwd = cwdPath || workspaceRoot;
          if (failure === 'maybe_conflict' && cwd) {
            child_process.execFile('git', ['diff', '--name-only', '--diff-filter=U'], { cwd, windowsHide: true }, (err, stdout) => {
              if (!err && stdout.trim()) {
                void this.player.play('merge_conflict.mp3');
              } else {
                void this.player.play('terminal_fail.mp3');
              }
            });
          } else if (failure === 'tests_fail') {
            void this.player.play('tests_fail.mp3');
          } else {
            void this.player.play('terminal_fail.mp3');
          }
        }
        this.removeRunning(e);
      })
    );

    const onStart = (vscode.window as any).onDidStartTerminalShellExecution;
    if (typeof onStart === 'function') {
      this.disposables.push(
        onStart((e: any) => {
          if (e?.terminal && e.execution) {
            this.running.set(e.execution.id ?? Date.now() + Math.random(), {
              cmd: e.execution.commandLine.value,
              cwd: e.execution.cwd,
            });
            this.busyCount++;
          }
        })
      );
    }

    const onClose = (vscode.window as any).onDidCloseTerminal;
    if (typeof onClose === 'function') {
      this.disposables.push(
        onClose((t: vscode.Terminal) => {
          for (const [id, entry] of this.running) {
            if (entry.cmd) {
              this.running.delete(id);
              this.busyCount = Math.max(0, this.busyCount - 1);
            }
          }
        })
      );
    }
  }

  private removeRunning(e: TerminalShellExecutionEndEvent): void {
    this.busyCount = Math.max(0, this.busyCount - 1);
  }

  public get busy(): boolean {
    return this.busyCount > 0;
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
