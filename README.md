# AntiBluff

Make AI coding agents honest. Stop hallucinations, assumptions, and unverified claims.

AntiBluff injects a battle-tested honesty prompt into your AI coding tools — forcing them to verify before claiming, admit uncertainty, and never fabricate output.

## The Problem

AI coding agents routinely:

- Claim code works without running it
- Assume file paths, API shapes, and framework defaults from training data
- Say "should work" or "looks correct" without verification
- Fabricate terminal output and test results
- Present guesses as facts

## The Fix

One prompt, injected into your AI tool's config, that enforces:

- **Verify before claiming** — read the file, run the command, check the code
- **Label uncertainty** — if unverified, say so before stating conclusions
- **No fabricated output** — if you didn't run it, don't show output for it
- **Surface gaps** — after changes, list what was NOT verified
- **Ban weasel words** — "should work", "looks fine", "probably correct" → evidence or disclaimer

## Install

```bash
npx antibluff install
```

That's it. Detects your installed AI tools and adds the prompt to their global config.

## Supported Tools

| Tool | Global Config | Project Config |
|------|--------------|----------------|
| Claude Code | `~/.claude/CLAUDE.md` | `CLAUDE.md` |
| Cursor | `~/.cursor/rules/antibluff.mdc` | `.cursorrules` |
| Gemini CLI | `~/.gemini/GEMINI.md` | `GEMINI.md` |
| GitHub Copilot | — | `.github/copilot-instructions.md` |
| Windsurf | `~/.codeium/windsurf/memories/global_rules.md` | `.windsurfrules` |
| Aider | — | `.aider.conventions.md` |

### Installing the Tools

AntiBluff works with these AI coding tools. Install whichever ones you use:

**Claude Code** — Anthropic's CLI agent
```bash
npm install -g @anthropic-ai/claude-code
```

**Cursor** — AI-native code editor
```
Download from https://www.cursor.com
```

**Gemini CLI** — Google's CLI agent
```bash
npm install -g @google/gemini-cli
```

**GitHub Copilot** — AI pair programmer (VS Code extension)
```
Install "GitHub Copilot" from the VS Code Extensions marketplace
```

**Windsurf** — AI-powered code editor by Codeium
```
Download from https://windsurf.com
```

**Aider** — AI pair programming in your terminal
```bash
pip install aider-chat
# or
pipx install aider-chat
```

## Usage

```bash
# Install globally for all detected tools
npx antibluff install

# Install for a specific tool
npx antibluff install --tool claude-code

# Install in current project (all tools)
npx antibluff install --project

# Check installation status
npx antibluff status

# List supported tools and what's detected
npx antibluff list

# Update to latest prompt
npx antibluff update

# Remove from everywhere
npx antibluff uninstall

# Remove from a specific tool
npx antibluff uninstall --tool cursor
```

## How It Works

AntiBluff wraps its prompt in HTML comment markers and **prepends it to the top** of your config file so it takes highest priority:

```markdown
<!-- antibluff:start -->
<!-- antibluff@1.0.0 -->
## AntiBluff: Honesty & Verification (TOP PRIORITY)
...
<!-- antibluff:end -->

# Your existing config below...
```

The `<!-- antibluff@1.0.0 -->` version tag lets AntiBluff detect which version is installed and whether an update is needed. AI agents ignore HTML comments, so the marker is invisible to them.

This lets it cleanly install, update, and uninstall without touching the rest of your config.

## The Prompt

The full prompt injected by AntiBluff:

> **Always be honest, in every response, unprompted.** If you have not verified something, say so before stating a conclusion — do not wait to be asked.
>
> **Never assume. Always check the real data.** No reasoning from training-memory defaults (Bootstrap colors, framework versions, file paths, API shapes, default props, repo structure, package versions, etc). Read the actual file / run the actual command / inspect the actual code in the current project before stating a fact.
>
> If a claim depends on something not yet verified, either (a) verify it first, or (b) explicitly label it as unverified and call out what would need to be checked.
>
> After making a change, proactively list what you did NOT verify (visual rendering, runtime behavior, edge cases, side effects on unrelated code, cross-file coupling). Do not let the user discover gaps by asking.
>
> "Looks the same" / "should match" / "probably fine" / "should work" are red flags — replace them with verified evidence or an explicit "I have not verified X".
>
> **Never fabricate terminal output, test results, or command responses.** If you haven't run it, don't show output for it.
>
> **Distinguish between "I checked and it's fine" vs "I believe it's fine."** The first requires evidence. The second requires a disclaimer.

## Programmatic API

```javascript
const { install, uninstall, status, PROMPT, VERSION, getInstalledVersion } = require('antibluff');

// Install for Claude Code globally
install('claude-code', 'global');

// Get the raw prompt text and current version
console.log(PROMPT);
console.log(VERSION);

// Check what's installed (includes installedVersion per entry)
const entries = status();
```

## License

MIT
