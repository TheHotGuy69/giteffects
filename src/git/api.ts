import * as vscode from 'vscode';
import { Player } from '../playback/player';

export class GitApiEvents implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private attached = new WeakSet<any>();

  constructor(private context: vscode.ExtensionContext, private player: Player) {}

  public async activate(): Promise<void> {
    const ext = vscode.extensions.getExtension('vscode.git');
    if (!ext) {
      this.player.log('vscode.git extension not found');
      return;
    }

    try {
      if (!ext.isActive) {
        await ext.activate();
      }
    } catch (err) {
      this.player.log('Failed to activate vscode.git extension');
      return;
    }

    const api = ext.exports?.getAPI?.(1);
    if (!api || !api.repositories) {
      this.player.log('Git extension API v1 not available');
      return;
    }

    for (const repo of api.repositories) {
      this.attach(repo);
    }

    const onDidOpen = api.onDidOpenRepository;
    if (typeof onDidOpen === 'function') {
      this.disposables.push(
        onDidOpen((repo: any) => {
          this.attach(repo);
        })
      );
    }
  }

  private attach(repo: any): void {
    if (this.attached.has(repo)) {
      return;
    }
    this.attached.add(repo);

    if (typeof repo.onDidCommit === 'function') {
      this.disposables.push(
        repo.onDidCommit(() => {
          void this.player.play('commit.mp3');
        })
      );
    }
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
