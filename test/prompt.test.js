'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  VERSION,
  PROMPT,
  MARKER_START,
  MARKER_END,
  hasAntibluff,
  injectPrompt,
  removePrompt,
  wrapWithMarkers,
  getInstalledVersion,
} = require('../src/prompt');

describe('prompt constants', () => {
  it('PROMPT is non-empty and contains key text', () => {
    assert.ok(PROMPT.length > 100);
    assert.ok(PROMPT.includes('AntiBluff'));
    assert.ok(PROMPT.includes('TOP PRIORITY'));
  });

  it('VERSION matches package.json', () => {
    const pkg = require('../package.json');
    assert.strictEqual(VERSION, pkg.version);
  });

  it('markers are HTML comments', () => {
    assert.ok(MARKER_START.startsWith('<!--'));
    assert.ok(MARKER_START.endsWith('-->'));
    assert.ok(MARKER_END.startsWith('<!--'));
    assert.ok(MARKER_END.endsWith('-->'));
  });
});

describe('wrapWithMarkers', () => {
  it('wraps content with start and end markers', () => {
    const wrapped = wrapWithMarkers('hello');
    assert.ok(wrapped.startsWith(MARKER_START));
    assert.ok(wrapped.endsWith(MARKER_END));
    assert.ok(wrapped.includes('hello'));
  });

  it('includes version tag', () => {
    const wrapped = wrapWithMarkers('test');
    assert.ok(wrapped.includes(`<!-- antibluff@${VERSION} -->`));
  });

  it('version tag is between start marker and content', () => {
    const wrapped = wrapWithMarkers('content here');
    const lines = wrapped.split('\n');
    assert.strictEqual(lines[0], MARKER_START);
    assert.strictEqual(lines[1], `<!-- antibluff@${VERSION} -->`);
    assert.strictEqual(lines[2], 'content here');
    assert.strictEqual(lines[3], MARKER_END);
  });
});

describe('hasAntibluff', () => {
  it('detects both markers', () => {
    const content = `some stuff\n${MARKER_START}\nprompt\n${MARKER_END}\nmore stuff`;
    assert.strictEqual(hasAntibluff(content), true);
  });

  it('returns false without markers', () => {
    assert.strictEqual(hasAntibluff('no markers here'), false);
    assert.strictEqual(hasAntibluff(''), false);
  });

  it('returns false with only start marker', () => {
    assert.strictEqual(hasAntibluff(`only ${MARKER_START}`), false);
  });

  it('returns false with only end marker', () => {
    assert.strictEqual(hasAntibluff(`only ${MARKER_END}`), false);
  });
});

describe('getInstalledVersion', () => {
  it('extracts version from tagged content', () => {
    const content = `${MARKER_START}\n<!-- antibluff@2.3.4 -->\nprompt\n${MARKER_END}`;
    assert.strictEqual(getInstalledVersion(content), '2.3.4');
  });

  it('returns null for untagged content', () => {
    const content = `${MARKER_START}\nprompt\n${MARKER_END}`;
    assert.strictEqual(getInstalledVersion(content), null);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(getInstalledVersion(''), null);
  });

  it('extracts version with pre-release tag', () => {
    const content = `<!-- antibluff@1.0.0-beta.1 -->`;
    assert.strictEqual(getInstalledVersion(content), '1.0.0-beta.1');
  });
});

describe('injectPrompt', () => {
  it('injects into empty content', () => {
    const result = injectPrompt('', PROMPT);
    assert.ok(result.includes(MARKER_START));
    assert.ok(result.includes(MARKER_END));
    assert.ok(result.includes(PROMPT));
    assert.ok(result.endsWith('\n'));
  });

  it('injects into whitespace-only content', () => {
    const result = injectPrompt('   \n\n  ', PROMPT);
    assert.ok(result.includes(MARKER_START));
    assert.ok(result.includes(PROMPT));
    assert.ok(result.endsWith('\n'));
  });

  it('prepends to existing content', () => {
    const existing = '# My Config\n\nSome rules here.';
    const result = injectPrompt(existing, PROMPT);
    assert.ok(result.startsWith(MARKER_START), 'should start with marker');
    assert.ok(result.includes(PROMPT));
    assert.ok(result.includes('# My Config'));
    assert.ok(result.includes('Some rules here.'));
  });

  it('antibluff section comes before existing content', () => {
    const existing = '# Existing Header\nSome content';
    const result = injectPrompt(existing, 'test prompt');
    const markerIdx = result.indexOf(MARKER_START);
    const existingIdx = result.indexOf('# Existing Header');
    assert.ok(markerIdx < existingIdx, 'markers should come before existing content');
  });

  it('replaces existing antibluff section', () => {
    const existing = `before\n${MARKER_START}\n<!-- antibluff@0.0.1 -->\nold prompt\n${MARKER_END}\nafter`;
    const result = injectPrompt(existing, 'new prompt');
    assert.ok(result.includes('new prompt'));
    assert.ok(!result.includes('old prompt'));
    assert.ok(result.includes('before'));
    assert.ok(result.includes('after'));
  });

  it('preserves surrounding content on replace', () => {
    const existing = `# Title\n\n${MARKER_START}\n<!-- antibluff@0.1.0 -->\nold\n${MARKER_END}\n\n## Footer`;
    const result = injectPrompt(existing, 'updated');
    assert.ok(result.includes('# Title'));
    assert.ok(result.includes('## Footer'));
    assert.ok(result.includes('updated'));
  });

  it('includes version tag in injected content', () => {
    const result = injectPrompt('', 'test');
    assert.ok(result.includes(`<!-- antibluff@${VERSION} -->`));
  });

  it('handles CRLF line endings', () => {
    const existing = '# Config\r\nSome rules\r\n';
    const result = injectPrompt(existing, 'test');
    assert.ok(result.includes(MARKER_START));
    assert.ok(result.includes('test'));
    assert.ok(result.includes('# Config'));
  });
});

describe('removePrompt', () => {
  it('removes antibluff section', () => {
    const existing = `before\n\n${MARKER_START}\n<!-- antibluff@1.0.0 -->\nprompt\n${MARKER_END}\n\nafter`;
    const result = removePrompt(existing);
    assert.ok(!result.includes(MARKER_START));
    assert.ok(!result.includes(MARKER_END));
    assert.ok(result.includes('before'));
    assert.ok(result.includes('after'));
  });

  it('returns empty string if only antibluff content', () => {
    const existing = `${MARKER_START}\n<!-- antibluff@1.0.0 -->\nprompt\n${MARKER_END}`;
    const result = removePrompt(existing);
    assert.strictEqual(result, '');
  });

  it('returns unchanged if no markers', () => {
    const content = 'no markers';
    const result = removePrompt(content);
    assert.strictEqual(result, content);
  });

  it('cleans up whitespace after removal', () => {
    const existing = `# Title\n\n\n${MARKER_START}\nprompt\n${MARKER_END}\n\n\n# Footer\n`;
    const result = removePrompt(existing);
    assert.ok(!result.includes('\n\n\n'), 'should not have triple newlines');
    assert.ok(result.includes('# Title'));
    assert.ok(result.includes('# Footer'));
  });

  it('removes section at the top of file', () => {
    const existing = `${MARKER_START}\n<!-- antibluff@1.0.0 -->\nprompt\n${MARKER_END}\n\n# My Config\nSome rules`;
    const result = removePrompt(existing);
    assert.ok(!result.includes(MARKER_START));
    assert.ok(result.includes('# My Config'));
    assert.ok(result.includes('Some rules'));
  });
});
