import * as path from 'path';
import * as vscode from 'vscode';
import { getSettings, resolveSoundPath, Settings } from '../config/settings';

export class Player {
  private static instance: Player | null = null;

  private constructor(private context: vscode.ExtensionContext) {}

  public static getInstance(context: vscode.ExtensionContext): Player {
    if (!Player.instance) {
      Player.instance = new Player(context);
    }
    return Player.instance;
  }

  public async play(filename: string): Promise<void> {
    const settings = getSettings(this.context);
    if (!settings.enabled) {
      return;
    }

    const soundPath = resolveSoundPath(this.context, filename, settings);
    if (!soundPath) {
      vscode.window.showWarningMessage(`GitEffects: sound file not found: ${filename}`);
      return;
    }

    try {
      const player = new (require('play-sound') as any)({});
      player.play(soundPath, (err: any) => {
        if (err) {
          vscode.window.showWarningMessage(`GitEffects: failed to play ${filename}: ${err.message}`);
        }
      });
    } catch (err) {
      vscode.window.showWarningMessage(`GitEffects: could not play sound. Ensure a media player is installed.`);
    }
  }
}
