import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface Settings {
  enabled: boolean;
  volume: number;
  soundsPath: string;
}

export function getSettings(context: vscode.ExtensionContext): Settings {
  const config = vscode.workspace.getConfiguration('giteffects');

  return {
    enabled: config.get<boolean>('enabled', true),
    volume: config.get<number>('volume', 1.0),
    soundsPath: config.get<string>('soundsPath', ''),
  };
}

export function resolveSoundPath(context: vscode.ExtensionContext, filename: string, settings: Settings): string | null {
  if (settings.soundsPath && settings.soundsPath.trim() !== '') {
    const customPath = path.join(settings.soundsPath, filename);
    if (fs.existsSync(customPath)) {
      return customPath;
    }
    context.workspaceState.update('lastWarning', `Custom sounds path does not contain ${filename}: ${settings.soundsPath}`);
  }

  const bundledPath = path.join(context.extensionPath, 'sounds', filename);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  return null;
}
