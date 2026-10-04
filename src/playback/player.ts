import * as path from 'path';
import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { getSettings, resolveSoundPath, Settings } from '../config/settings';

const COOLDOWN_MS = 1200;
const playedAt = new Map<string, number>();

export class Player {
  private static instance: Player | null = null;
  private channel: vscode.OutputChannel;
  private warned = new Set<string>();

  private constructor(private context: vscode.ExtensionContext) {
    this.channel = vscode.window.createOutputChannel('GitEffects');
  }

  public static getInstance(context: vscode.ExtensionContext): Player {
    if (!Player.instance) {
      Player.instance = new Player(context);
    }
    return Player.instance;
  }

  public log(message: string): void {
    this.channel.appendLine(message);
  }

  public async play(filename: string, bypassCooldown = false): Promise<void> {
    const settings = getSettings(this.context);
    if (!settings.enabled) {
      return;
    }

    const now = Date.now();
    if (!bypassCooldown) {
      const last = playedAt.get(filename) || 0;
      if (now - last < COOLDOWN_MS) {
        return;
      }
    }
    playedAt.set(filename, now);

    const soundPath = resolveSoundPath(this.context, filename, settings);
    if (!soundPath) {
      if (!this.warned.has(filename)) {
        this.warned.add(filename);
        this.log(`Sound file not found: ${filename}`);
      }
      return;
    }

    const volume = Math.max(0, Math.min(1, settings.volume));
    const platform = process.platform;
    const env = { ...process.env, GITEFFECTS_VOLUME: String(volume), GITEFFECTS_FILE: soundPath };

    if (platform === 'darwin') {
      const args = ['-v', String(volume), soundPath];
      child_process.spawn('afplay', args, { stdio: 'ignore', windowsHide: true }).on('error', () => {
        if (!this.warned.has('player')) { this.warned.add('player'); this.log('afplay failed'); }
      });
    } else if (platform === 'win32') {
      const script = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Volume = $env:GITEFFECTS_VOLUME
$player.Open([Uri]$env:GITEFFECTS_FILE)
$player.Play()
Start-Sleep -Seconds 5`;
      child_process.spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], {
        stdio: 'ignore',
        windowsHide: true,
        env,
      }).on('error', () => {
        if (!this.warned.has('player')) { this.warned.add('player'); this.log('PowerShell media player failed'); }
      });
    } else {
      const volumeFfmpeg = Math.round(volume * 100);
      const volumeMpg123 = Math.round(volume * 20000);
      const cmds: [string, string[]][] = [
        ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-volume', String(volumeFfmpeg), soundPath]],
        ['mpg123', ['-q', '-f', String(volumeMpg123), soundPath]],
        ['cvlc', ['--play-and-exit', '--quiet', soundPath]],
      ];
      let tried = 0;
      const tryNext = (): void => {
        if (tried >= cmds.length) {
          if (!this.warned.has('player')) { this.warned.add('player'); this.log('No compatible audio player found'); }
          return;
        }
        const [cmd, args] = cmds[tried++] as [string, string[]];
        const proc = child_process.spawn(cmd, args, { stdio: 'ignore', windowsHide: true, env });
        proc.on('error', tryNext);
      };
      tryNext();
    }
  }
}
