'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'bin', 'antibluff.js');
const NODE = process.execPath;

function runCli(...args) {
  try {
    return execFileSync(NODE, [BIN, ...args], {
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, NO_COLOR: '1' },
    });
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

describe('cli', () => {
  describe('version', () => {
    it('prints version with --version flag', () => {
      const output = runCli('--version');
      const pkg = require('../package.json');
      assert.ok(output.includes(pkg.version));
    });

    it('prints version with -v flag', () => {
      const output = runCli('-v');
      const pkg = require('../package.json');
      assert.ok(output.includes(pkg.version));
    });

    it('prints version with version command', () => {
      const output = runCli('version');
      const pkg = require('../package.json');
      assert.ok(output.includes(pkg.version));
    });
  });

  describe('help', () => {
    it('prints help with help command', () => {
      const output = runCli('help');
      assert.ok(output.includes('AntiBluff'));
      assert.ok(output.includes('install'));
      assert.ok(output.includes('uninstall'));
      assert.ok(output.includes('status'));
    });

    it('prints help with --help flag', () => {
      const output = runCli('--help');
      assert.ok(output.includes('AntiBluff'));
    });

    it('prints help with -h flag', () => {
      const output = runCli('-h');
      assert.ok(output.includes('AntiBluff'));
    });

    it('prints help when no command given', () => {
      const output = runCli();
      assert.ok(output.includes('AntiBluff'));
    });

    it('help includes all supported tools', () => {
      const output = runCli('help');
      assert.ok(output.includes('claude-code'));
      assert.ok(output.includes('cursor'));
      assert.ok(output.includes('gemini'));
      assert.ok(output.includes('copilot'));
      assert.ok(output.includes('windsurf'));
      assert.ok(output.includes('aider'));
    });

    it('help includes examples', () => {
      const output = runCli('help');
      assert.ok(output.includes('npx antibluff install'));
    });
  });

  describe('list', () => {
    it('lists supported tools', () => {
      const output = runCli('list');
      assert.ok(output.includes('Supported Tools'));
    });

    it('ls is an alias for list', () => {
      const output = runCli('ls');
      assert.ok(output.includes('Supported Tools'));
    });
  });

  describe('status', () => {
    it('prints status header', () => {
      const output = runCli('status');
      assert.ok(output.includes('Status'));
    });
  });

  describe('unknown command', () => {
    it('exits with error for unknown command', () => {
      const result = runCli('foobar');
      assert.ok(typeof result === 'object', 'should return error object');
      assert.ok(result.stdout.includes('Unknown command') || result.stderr.includes('Unknown command'));
      assert.strictEqual(result.exitCode, 1);
    });
  });

  describe('install with invalid tool', () => {
    it('exits with error for unknown tool', () => {
      const result = runCli('install', '--tool', 'nonexistent');
      assert.ok(typeof result === 'object');
      assert.ok(
        result.stdout.includes('Unknown tool') || result.stderr.includes('Unknown tool'),
        'should show unknown tool error'
      );
      assert.strictEqual(result.exitCode, 1);
    });
  });

  describe('update with invalid tool', () => {
    it('exits with error for unknown tool', () => {
      const result = runCli('update', '--tool', 'nonexistent');
      assert.ok(typeof result === 'object');
      assert.ok(
        result.stdout.includes('Unknown tool') || result.stderr.includes('Unknown tool'),
        'should show unknown tool error'
      );
      assert.strictEqual(result.exitCode, 1);
    });
  });

  describe('uninstall with invalid tool', () => {
    it('exits with error for unknown tool', () => {
      const result = runCli('uninstall', '--tool', 'nonexistent');
      assert.ok(typeof result === 'object');
      assert.ok(
        result.stdout.includes('Unknown tool') || result.stderr.includes('Unknown tool'),
        'should show unknown tool error'
      );
      assert.strictEqual(result.exitCode, 1);
    });
  });
});
