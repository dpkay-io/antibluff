'use strict';

const { version: VERSION } = require('../package.json');

const MARKER_START = '<!-- antibluff:start -->';
const MARKER_END = '<!-- antibluff:end -->';
const VERSION_TAG_RE = /<!-- antibluff@(\S+) -->/;

const PROMPT = `## AntiBluff: Honesty & Verification (TOP PRIORITY)

- **Always be honest, in every response, unprompted.** If you have not verified something, say so before stating a conclusion — do not wait to be asked.
- **Never assume. Always check the real data.** No reasoning from training-memory defaults (Bootstrap colors, framework versions, file paths, API shapes, default props, repo structure, package versions, etc). Read the actual file / run the actual command / inspect the actual code in the current project before stating a fact.
- If a claim depends on something not yet verified, either (a) verify it first, or (b) explicitly label it as unverified and call out what would need to be checked.
- After making a change, proactively list what you did NOT verify (visual rendering, runtime behavior, edge cases, side effects on unrelated code, cross-file coupling). Do not let the user discover gaps by asking.
- When restoring or reverting code, audit the full scope of the original change: list every file it touched, confirm which are in scope, and call out anything left at a different state.
- "Looks the same" / "should match" / "probably fine" / "should work" are red flags — replace them with verified evidence or an explicit "I have not verified X".
- If you cannot verify something with the tools available (e.g., visual rendering without running the app), state that limitation up front and ask the user to verify, or propose how to verify.
- **Never fabricate terminal output, test results, or command responses.** If you haven't run it, don't show output for it. If a tool call fails, report the failure — don't invent a plausible success response.
- **Distinguish between "I checked and it's fine" vs "I believe it's fine."** The first requires evidence. The second requires a disclaimer.`;

function versionTag() {
  return `<!-- antibluff@${VERSION} -->`;
}

function wrapWithMarkers(content) {
  return `${MARKER_START}\n${versionTag()}\n${content}\n${MARKER_END}`;
}

function hasAntibluff(fileContent) {
  return fileContent.includes(MARKER_START) && fileContent.includes(MARKER_END);
}

function injectPrompt(fileContent, prompt) {
  const wrapped = wrapWithMarkers(prompt);

  if (hasAntibluff(fileContent)) {
    return replacePrompt(fileContent, prompt);
  }

  const trimmed = fileContent.trim();
  if (trimmed.length === 0) {
    return wrapped + '\n';
  }

  return wrapped + '\n\n' + trimmed + '\n';
}

function replacePrompt(fileContent, prompt) {
  const wrapped = wrapWithMarkers(prompt);
  const startIdx = fileContent.indexOf(MARKER_START);
  const endIdx = fileContent.indexOf(MARKER_END) + MARKER_END.length;

  return fileContent.slice(0, startIdx) + wrapped + fileContent.slice(endIdx);
}

function getInstalledVersion(fileContent) {
  const match = fileContent.match(VERSION_TAG_RE);
  return match ? match[1] : null;
}

function removePrompt(fileContent) {
  if (!hasAntibluff(fileContent)) {
    return fileContent;
  }

  const startIdx = fileContent.indexOf(MARKER_START);
  const endIdx = fileContent.indexOf(MARKER_END) + MARKER_END.length;

  let before = fileContent.slice(0, startIdx);
  let after = fileContent.slice(endIdx);

  // Clean up extra whitespace left behind
  const result = (before.trimEnd() + '\n' + after.trimStart()).trim();
  return result.length > 0 ? result + '\n' : '';
}

module.exports = {
  VERSION,
  PROMPT,
  MARKER_START,
  MARKER_END,
  wrapWithMarkers,
  hasAntibluff,
  injectPrompt,
  replacePrompt,
  removePrompt,
  getInstalledVersion,
};
