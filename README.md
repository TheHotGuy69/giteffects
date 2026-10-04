# GitEffects

Plays sound effects for git and terminal events in VS Code and Antigravity IDE.

## Events and sounds

| Event | File | Trigger |
|---|---|---|
| Commit | `commit.mp3` | `git commit` succeeds in the terminal or Source Control panel |
| Push | `push.mp3` | `git push` succeeds |
| Force push | `force_push.mp3` | `git push` with `-f`, `--force`, or `--force-with-lease` succeeds |
| Merge conflict | `merge_conflict.mp3` | a merge/pull/rebase/cherry-pick/revert/apply/stash pop leaves unmerged files |
| Hard reset | `reset.mp3` | `git reset --hard` succeeds |
| Delete branch | `delete_branch.mp3` | `git branch -d`, `-D`, or `--delete` succeeds |
| Tests fail | `tests_fail.mp3` | a recognised test command exits non-zero |
| Terminal fail | `terminal_fail.mp3` | any other command exits non-zero |

### Detection methods

- **VS Code Git extension API** — listens for `onDidCommit` from `vscode.git` when available.
- **Filesystem watcher** — watches `.git/logs/`, `.git/refs/remotes/`, and conflict markers (`MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `rebase-merge`, `rebase-apply`) for CLI-triggered events.
- **Terminal shell integration** — detects `git` and test commands typed in the terminal and classifies the exit code. This requires a shell-integrated terminal (bash, zsh, fish, PowerShell).

Commit/push from the Source Control panel is detected via the filesystem watcher (best effort).

## Installation

```bash
cd giteffects
npm install
npm run compile
```

## Package as `.vsix`

```bash
npm run package
```

Install in VS Code / Antigravity:

- **VS Code**: Extensions view → `...` → `Install from VSIX...`
- **Antigravity**: Extensions view → `...` → `Install from VSIX...`

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
|---|---|---|---|
| `giteffects.enabled` | `boolean` | `true` | Enable or disable sound playback |
| `giteffects.volume` | `number` | `1.0` | Playback volume (`0.0` to `1.0`) |
| `giteffects.soundsPath` | `string` | `""` | Custom directory containing sound files. Leave empty to use bundled sounds. |

## Commands

- **GitEffects: Toggle On/Off** — enables or disables sounds globally
- **GitEffects: Play a Test Sound** — previews any of the 8 event sounds

A status bar item (`$(unmute)` / `$(mute) GitEffects`) runs the toggle command and updates when settings change.

## Development

```bash
npm run watch    # TypeScript watch mode
npm test         # Run classification tests
```

Press `F5` in VS Code to launch an Extension Development Host for testing.

## Platform notes

- Sound playback uses OS-native players (`afplay` on macOS, PowerShell on Windows, `ffplay`/`mpg123`/`cvlc` on Linux).
- Terminal shell integration needs a compatible shell. If unavailable, terminal events are silently skipped.

## License

MIT — Copyright (c) TheHotGuy69
# test
