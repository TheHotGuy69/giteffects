import * as vscode from 'vscode';
import { Player } from './playback/player';
import { GitApiEvents } from './git/api';
import { GitWatcher } from './git/watcher';
import { TerminalShellEvents } from './terminal/shell';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const player = Player.getInstance(context);
  player.log('GitEffects activated');

  const gitApiEvents = new GitApiEvents(context, player);
  const terminalShellEvents = new TerminalShellEvents(player);
  const gitWatcher = new GitWatcher(player, () => terminalShellEvents.busy);

  terminalShellEvents.activate();
  gitApiEvents.activate().catch(() => {
    player.log('Git API initialization failed; continuing without it');
  });

  const disposables: vscode.Disposable[] = [
    gitApiEvents,
    gitWatcher,
    terminalShellEvents,
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      for (const folder of e.added) {
        gitWatcher.activate(folder.uri.fsPath);
      }
      for (const folder of e.removed) {
        gitWatcher.deactivate(folder.uri.fsPath);
      }
    }),
    vscode.commands.registerCommand('giteffects.toggle', () => {
      const config = vscode.workspace.getConfiguration('giteffects');
      const current = config.get<boolean>('enabled', true);
      void config.update('enabled', !current, true);
    }),
    vscode.commands.registerCommand('giteffects.testSound', async () => {
      const items = [
        { label: 'Commit', sound: 'commit.mp3' },
        { label: 'Push', sound: 'push.mp3' },
        { label: 'Force push', sound: 'force_push.mp3' },
        { label: 'Merge conflict', sound: 'merge_conflict.mp3' },
        { label: 'Hard reset', sound: 'reset.mp3' },
        { label: 'Delete branch', sound: 'delete_branch.mp3' },
        { label: 'Tests fail', sound: 'tests_fail.mp3' },
        { label: 'Terminal fail', sound: 'terminal_fail.mp3' },
      ];
      const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a test sound' });
      if (pick) {
        void player.play(pick.sound, true);
      }
    }),
  ];

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'giteffects.toggle';
  statusBar.tooltip = 'GitEffects: Click to toggle on/off';

  const updateStatus = () => {
    const enabled = vscode.workspace.getConfiguration('giteffects').get<boolean>('enabled', true);
    statusBar.text = enabled ? '$(unmute) GitEffects' : '$(mute) GitEffects';
    statusBar.show();
  };
  updateStatus();

  const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('giteffects')) {
      updateStatus();
    }
  });

  disposables.push(statusBar, onConfigChange);

  if (vscode.workspace.workspaceFolders) {
    for (const folder of vscode.workspace.workspaceFolders) {
      gitWatcher.activate(folder.uri.fsPath);
    }
  }

  disposables.forEach((d) => context.subscriptions.push(d));
}

export function deactivate(): void {
  //
}
