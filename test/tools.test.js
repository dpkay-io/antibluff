'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const { TOOLS, getToolIds, getTool, detectInstalledTools, resolveConfigPath } = require('../src/tools');

const HOME = os.homedir();
const ALL_TOOL_IDS = ['claude-code', 'cursor', 'gemini', 'copilot', 'windsurf', 'aider'];

describe('getToolIds', () => {
  it('returns all expected tool IDs', () => {
    const ids = getToolIds();
    assert.deepStrictEqual(ids, ALL_TOOL_IDS);
  });

  it('returns an array', () => {
    assert.ok(Array.isArray(getToolIds()));
  });
});

describe('getTool', () => {
  it('returns config for each known tool', () => {
    for (const id of ALL_TOOL_IDS) {
      const tool = getTool(id);
      assert.ok(tool, `getTool('${id}') should return a truthy value`);
      assert.ok(typeof tool.name === 'string', `${id} should have a name`);
      assert.ok(typeof tool.detect === 'function', `${id} should have a detect function`);
      assert.ok(typeof tool.format === 'string', `${id} should have a format`);
    }
  });

  it('returns null for unknown tool', () => {
    assert.strictEqual(getTool('nonexistent'), null);
    assert.strictEqual(getTool(''), null);
    assert.strictEqual(getTool(undefined), null);
  });

  it('all tools have a projectFile', () => {
    for (const id of ALL_TOOL_IDS) {
      const tool = getTool(id);
      assert.ok(typeof tool.projectFile === 'string', `${id} should have a projectFile`);
    }
  });

  it('copilot and aider have no global path', () => {
    assert.strictEqual(getTool('copilot').globalPath, null);
    assert.strictEqual(getTool('aider').globalPath, null);
  });

  it('claude-code, cursor, gemini, windsurf have global paths', () => {
    for (const id of ['claude-code', 'cursor', 'gemini', 'windsurf']) {
      const tool = getTool(id);
      assert.ok(typeof tool.globalPath === 'string', `${id} should have a global path`);
      assert.ok(tool.globalPath.length > 0, `${id} global path should be non-empty`);
    }
  });
});

describe('TOOLS config paths', () => {
  it('claude-code global points to ~/.claude/CLAUDE.md', () => {
    assert.strictEqual(TOOLS['claude-code'].globalPath, path.join(HOME, '.claude', 'CLAUDE.md'));
  });

  it('gemini global points to ~/.gemini/GEMINI.md', () => {
    assert.strictEqual(TOOLS.gemini.globalPath, path.join(HOME, '.gemini', 'GEMINI.md'));
  });

  it('copilot project file is in .github/', () => {
    assert.strictEqual(TOOLS.copilot.projectFile, path.join('.github', 'copilot-instructions.md'));
  });
});

describe('detectInstalledTools', () => {
  it('returns an array', () => {
    const result = detectInstalledTools();
    assert.ok(Array.isArray(result));
  });

  it('only contains valid tool IDs', () => {
    const result = detectInstalledTools();
    for (const id of result) {
      assert.ok(ALL_TOOL_IDS.includes(id), `detected id '${id}' should be a valid tool ID`);
    }
  });

  it('copilot is always detected', () => {
    const result = detectInstalledTools();
    assert.ok(result.includes('copilot'), 'copilot should always be detected');
  });
});

describe('resolveConfigPath', () => {
  it('returns null for unknown tool', () => {
    assert.strictEqual(resolveConfigPath('nonexistent', 'global'), null);
  });

  it('returns null for copilot global (no global config)', () => {
    assert.strictEqual(resolveConfigPath('copilot', 'global'), null);
  });

  it('returns null for aider global (no global config)', () => {
    assert.strictEqual(resolveConfigPath('aider', 'global'), null);
  });

  it('returns global path for tools with global config', () => {
    const result = resolveConfigPath('claude-code', 'global');
    assert.strictEqual(result, path.join(HOME, '.claude', 'CLAUDE.md'));
  });

  it('returns absolute project path for project scope', () => {
    const result = resolveConfigPath('claude-code', 'project');
    assert.ok(path.isAbsolute(result), 'project path should be absolute');
    assert.ok(result.endsWith('CLAUDE.md'));
  });

  it('project path for copilot includes .github directory', () => {
    const result = resolveConfigPath('copilot', 'project');
    assert.ok(result.includes('.github'));
    assert.ok(result.endsWith('copilot-instructions.md'));
  });

  it('all tools resolve a project path', () => {
    for (const id of ALL_TOOL_IDS) {
      const result = resolveConfigPath(id, 'project');
      assert.ok(result, `${id} should have a project path`);
      assert.ok(path.isAbsolute(result), `${id} project path should be absolute`);
    }
  });
});

describe('detect functions', () => {
  it('detect returns boolean for each tool', () => {
    for (const id of ALL_TOOL_IDS) {
      const tool = getTool(id);
      const result = tool.detect();
      assert.strictEqual(typeof result, 'boolean', `${id}.detect() should return boolean`);
    }
  });
});
