'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { MARKER_START, MARKER_END, VERSION, PROMPT, hasAntibluff, getInstalledVersion } = require('../src/prompt');

const TMP_ROOT = path.join(os.tmpdir(), 'antibluff-test-' + process.pid);

function tmpFile(...segments) {
  return path.join(TMP_ROOT, ...segments);
}

function mkdirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath, content) {
  mkdirFor(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function freshInstaller(toolId, globalPath, projectFile) {
  const home = tmpFile('home');
  const projectDir = tmpFile('project');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  const tools = {
    [toolId]: {
      name: 'Test Tool',
      globalPath: globalPath ? path.join(home, globalPath) : null,
      projectFile: projectFile || 'CONFIG.md',
      format: 'markdown',
      detect() { return true; },
    },
  };

  delete require.cache[require.resolve('../src/installer')];
  delete require.cache[require.resolve('../src/tools')];

  const origTools = require('../src/tools');
  const origGetTool = origTools.getTool;
  const origResolve = origTools.resolveConfigPath;
  const origDetect = origTools.detectInstalledTools;
  const origGetIds = origTools.getToolIds;

  origTools.getTool = (id) => tools[id] || null;
  origTools.resolveConfigPath = (id, scope) => {
    const tool = tools[id];
    if (!tool) return null;
    if (scope === 'global') return tool.globalPath;
    return path.join(projectDir, tool.projectFile);
  };
  origTools.detectInstalledTools = () => Object.keys(tools);
  origTools.getToolIds = () => Object.keys(tools);

  delete require.cache[require.resolve('../src/installer')];
  const installer = require('../src/installer');

  return {
    installer,
    home,
    projectDir,
    cleanup() {
      origTools.getTool = origGetTool;
      origTools.resolveConfigPath = origResolve;
      origTools.detectInstalledTools = origDetect;
      origTools.getToolIds = origGetIds;
      delete require.cache[require.resolve('../src/installer')];
    },
  };
}

describe('installer', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_ROOT, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  describe('install', () => {
    it('installs into new global file', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.install('test-tool', 'global');
        assert.strictEqual(result.success, true);

        const configPath = path.join(home, '.test', 'CONFIG.md');
        assert.ok(fs.existsSync(configPath), 'config file should be created');

        const content = readFile(configPath);
        assert.ok(hasAntibluff(content), 'should contain antibluff markers');
        assert.ok(content.includes(PROMPT), 'should contain prompt');
        assert.strictEqual(getInstalledVersion(content), VERSION);
      } finally {
        cleanup();
      }
    });

    it('installs into existing file (prepends)', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const configPath = path.join(home, '.test', 'CONFIG.md');
        writeFile(configPath, '# Existing Config\n\nSome rules.\n');

        const result = installer.install('test-tool', 'global');
        assert.strictEqual(result.success, true);

        const content = readFile(configPath);
        assert.ok(hasAntibluff(content));
        const markerIdx = content.indexOf(MARKER_START);
        const existingIdx = content.indexOf('# Existing Config');
        assert.ok(markerIdx < existingIdx, 'antibluff should be prepended');
      } finally {
        cleanup();
      }
    });

    it('refuses if already installed', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        installer.install('test-tool', 'global');
        const result = installer.install('test-tool', 'global');
        assert.strictEqual(result.success, false);
        assert.ok(result.message.includes('already installed'));
      } finally {
        cleanup();
      }
    });

    it('returns error for unknown tool', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.install('nonexistent', 'global');
        assert.strictEqual(result.success, false);
        assert.ok(result.message.includes('Unknown tool'));
      } finally {
        cleanup();
      }
    });

    it('returns error for unsupported scope', () => {
      const { installer, cleanup } = freshInstaller('no-global', null, 'CONFIG.md');
      try {
        const result = installer.install('no-global', 'global');
        assert.strictEqual(result.success, false);
      } finally {
        cleanup();
      }
    });

    it('creates parent directories as needed', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', 'deep/nested/dir/CONFIG.md');
      try {
        const result = installer.install('test-tool', 'global');
        assert.strictEqual(result.success, true);
        assert.ok(fs.existsSync(path.join(home, 'deep', 'nested', 'dir', 'CONFIG.md')));
      } finally {
        cleanup();
      }
    });
  });

  describe('uninstall', () => {
    it('removes antibluff from file', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        installer.install('test-tool', 'global');
        const result = installer.uninstall('test-tool', 'global');
        assert.strictEqual(result.success, true);

        const configPath = path.join(home, '.test', 'CONFIG.md');
        assert.ok(!fs.existsSync(configPath), 'empty file should be deleted');
      } finally {
        cleanup();
      }
    });

    it('preserves non-antibluff content', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const configPath = path.join(home, '.test', 'CONFIG.md');
        writeFile(configPath, '# My Rules\n');
        installer.install('test-tool', 'global');

        const result = installer.uninstall('test-tool', 'global');
        assert.strictEqual(result.success, true);

        const content = readFile(configPath);
        assert.ok(!hasAntibluff(content), 'markers should be removed');
        assert.ok(content.includes('# My Rules'), 'original content should remain');
      } finally {
        cleanup();
      }
    });

    it('returns error if not installed', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const configPath = path.join(home, '.test', 'CONFIG.md');
        writeFile(configPath, '# No antibluff here\n');

        const result = installer.uninstall('test-tool', 'global');
        assert.strictEqual(result.success, false);
      } finally {
        cleanup();
      }
    });

    it('returns error if file does not exist', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.uninstall('test-tool', 'global');
        assert.strictEqual(result.success, false);
      } finally {
        cleanup();
      }
    });

    it('returns error for unknown tool', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.uninstall('nonexistent', 'global');
        assert.strictEqual(result.success, false);
        assert.ok(result.message.includes('Unknown tool'));
      } finally {
        cleanup();
      }
    });
  });

  describe('update', () => {
    it('updates when content differs', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const configPath = path.join(home, '.test', 'CONFIG.md');
        const oldWrapped = `${MARKER_START}\n<!-- antibluff@0.0.1 -->\nold prompt text\n${MARKER_END}\n`;
        writeFile(configPath, oldWrapped);

        const result = installer.update('test-tool', 'global');
        assert.strictEqual(result.success, true);

        const content = readFile(configPath);
        assert.ok(content.includes(PROMPT), 'should contain updated prompt');
        assert.strictEqual(getInstalledVersion(content), VERSION);
      } finally {
        cleanup();
      }
    });

    it('reports up-to-date when content matches', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        installer.install('test-tool', 'global');
        const result = installer.update('test-tool', 'global');
        assert.strictEqual(result.success, true);
        assert.ok(result.message.includes('up to date'));
      } finally {
        cleanup();
      }
    });

    it('returns error if not installed', () => {
      const { installer, home, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const configPath = path.join(home, '.test', 'CONFIG.md');
        writeFile(configPath, '# No antibluff\n');

        const result = installer.update('test-tool', 'global');
        assert.strictEqual(result.success, false);
        assert.ok(result.message.includes('install first'));
      } finally {
        cleanup();
      }
    });

    it('returns error if file missing', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.update('test-tool', 'global');
        assert.strictEqual(result.success, false);
      } finally {
        cleanup();
      }
    });

    it('returns error for unknown tool', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const result = installer.update('nonexistent', 'global');
        assert.strictEqual(result.success, false);
        assert.ok(result.message.includes('Unknown tool'));
      } finally {
        cleanup();
      }
    });
  });

  describe('status', () => {
    it('returns entries for each tool/scope', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md', 'PROJECT.md');
      try {
        const entries = installer.status();
        assert.ok(Array.isArray(entries));
        assert.ok(entries.length > 0);

        for (const entry of entries) {
          assert.ok('tool' in entry);
          assert.ok('toolId' in entry);
          assert.ok('scope' in entry);
          assert.ok('path' in entry);
          assert.ok('fileExists' in entry);
          assert.ok('installed' in entry);
          assert.ok('installedVersion' in entry);
        }
      } finally {
        cleanup();
      }
    });

    it('shows installed=true after install', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        installer.install('test-tool', 'global');
        const entries = installer.status();
        const globalEntry = entries.find((e) => e.scope === 'global');
        assert.strictEqual(globalEntry.installed, true);
        assert.strictEqual(globalEntry.installedVersion, VERSION);
      } finally {
        cleanup();
      }
    });

    it('shows installed=false when not installed', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const entries = installer.status();
        const globalEntry = entries.find((e) => e.scope === 'global');
        assert.strictEqual(globalEntry.installed, false);
        assert.strictEqual(globalEntry.installedVersion, null);
      } finally {
        cleanup();
      }
    });
  });

  describe('installAll', () => {
    it('installs for detected tools', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const results = installer.installAll('global');
        assert.ok(Array.isArray(results));
        assert.ok(results.length > 0);
        assert.ok(results.every((r) => 'success' in r));
      } finally {
        cleanup();
      }
    });
  });

  describe('uninstallAll', () => {
    it('removes from all installed locations', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        installer.install('test-tool', 'global');
        const results = installer.uninstallAll();
        assert.ok(Array.isArray(results));
        assert.ok(results.length > 0);
        assert.ok(results.every((r) => r.success));
      } finally {
        cleanup();
      }
    });

    it('returns empty array when nothing installed', () => {
      const { installer, cleanup } = freshInstaller('test-tool', '.test/CONFIG.md');
      try {
        const results = installer.uninstallAll();
        assert.deepStrictEqual(results, []);
      } finally {
        cleanup();
      }
    });
  });
});
