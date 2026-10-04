import * as vscode from 'vscode';
import { Player } from '../playback/player';

export class GitApiEvents {
  private gitExtension: vscode.Extension<any> | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext, private player: Player) {
    this.gitExtension = vscode.extensions.getExtension('vscode.git');
  }

  public activate(): void {
    if (!this.gitExtension) {
      return;
    }

    const api = this.gitExtension.exports;
    if (!api || !api.repositories) {
      return;
    }

    const repositories = api.repositories;
    for (const repo of repositories) {
      this.attachRepositoryHandlers(repo);
    }

    const onDidChangeRepositories = api.onDidChangeRepositories;
    if (onDidChangeRepositories) {
      this.disposables.push(
        onDidChangeRepositories((e: any) => {
          if (e.added) {
            for (const repo of e.added) {
              this.attachRepositoryHandlers(repo);
            }
          }
        })
      );
    }
  }

  private attachRepositoryHandlers(repo: any): void {
    if (repo.onDidCommit) {
      this.disposables.push(
        repo.onDidCommit((e: any) => {
          void this.player.play('commit.mp3');
        })
      );
    }

    if (repo.onDidPush) {
      this.disposables.push(
        repo.onDidPush((e: any) => {
          void this.player.play('push.mp3');
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
