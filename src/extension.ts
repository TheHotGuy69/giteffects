import * as vscode from 'vscode';
import { Player } from './playback/player';
import { GitApiEvents } from './git/api';
import { GitWatcher } from './git/watcher';
import { TerminalShellEvents } from './terminal/shell';

const EVENT_COOLDOWN_MS = 500;
const eventCooldowns: Record<string, number> = {};

function withCooldown(eventKey: string, fn: () => void): void {
  const now = Date.now();
  if (now - (eventCooldowns[eventKey] || 0) > EVENT_COOLDOWN_MS) {
    eventCooldowns[eventKey] = now;
    fn();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('GitEffects');
  outputChannel.appendLine('GitEffects activated');

  const player = Player.getInstance(context);
  const gitApiEvents = new GitApiEvents(context, player);
  const gitWatcher = new GitWatcher(player);
  const terminalShellEvents = new TerminalShellEvents(player);

  gitApiEvents.activate();

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      gitWatcher.activate(folder.uri.fsPath);
    }
  }

  terminalShellEvents.activate();

  const disposables: vscode.Disposable[] = [
    gitApiEvents,
    gitWatcher,
    terminalShellEvents,
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      for (const folder of e.added) {
        gitWatcher.activate(folder.uri.fsPath);
      }
    }),
  ];

  disposables.forEach((d) => context.subscriptions.push(d));
}

export function deactivate(): void {
  //
}
