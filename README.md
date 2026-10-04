# GitEffects

Plays sound effects for git events (commit, push, merge conflict, terminal failure) and other developer moments in VS Code and Antigravity IDE.

## Features

- **Commit sound** — plays when a commit succeeds via the VS Code Git API or filesystem detection
- **Push sound** — plays when changes are pushed
- **Merge conflict sound** — plays when a merge conflict is detected
- **Terminal failure sound** — plays when a terminal command exits with a non-zero code

### Detection methods

1. **VS Code Git extension API** — listens to `onDidCommit` and `onDidPush` events from `vscode.git`
2. **Filesystem fallback** — watches `.git/logs/HEAD`, `.git/refs/remotes/`, and `.git/MERGE_HEAD` for CLI-triggered events
3. **Terminal shell integration** — detects `git commit` / `git push` typed in the terminal and plays sounds for failed terminal commands (non-zero exit code)

Duplicate events are deduplicated with a 500ms cooldown keyed by event type.

## Installation

### From source

```bash
cd giteffects
npm install
npm run compile
```

### Package as `.vsix`

```bash
npm run package
```

This produces a `.vsix` file you can install in VS Code or Antigravity IDE.

### Install in VS Code / Antigravity

- **VS Code**: Extensions view → "..." → "Install from VSIX..."
- **Antigravity**: Extensions view → "..." → "Install from VSIX..."

## Configuration

Open VS Code Settings and search for **GitEffects**, or edit `settings.json` directly:

```json
{
  "giteffects.enabled": true,
  "giteffects.volume": 1.0,
  "giteffects.soundsPath": ""
}
```

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `giteffects.enabled` | `boolean` | `true` | Enable or disable sound playback |
| `giteffects.volume` | `number` | `1.0` | Playback volume (`0.0` to `1.0`) |
| `giteffects.soundsPath` | `string` | `""` | Custom directory containing `.wav`/`.ogg`/`.mp3` sound files. Leave empty to use bundled sounds. |

## Sound files

The extension expects the following sound files in the configured sounds directory:

- `commit.mp3`
- `push.mp3`
- `merge_conflict.mp3`
- `terminal_fail.mp3`

You can replace bundled sounds by setting `giteffects.soundsPath` to a directory containing files with the same names.

## Development

```bash
npm run watch    # TypeScript watch mode
```

Press `F5` in VS Code to launch an Extension Development Host for testing.

## Platform notes

- Sound playback uses OS-native media players (`afplay` on macOS, `aplay` on Linux, PowerShell on Windows) via the `play-sound` npm package.
- Terminal failure detection requires shell-integrated terminals (bash, zsh, fish, PowerShell). Unusual shells or remote sessions may not activate this feature. If unavailable, terminal failure sounds are silently skipped.

## License

MIT
