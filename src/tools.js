'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const HOME = os.homedir();

const TOOLS = {
  'claude-code': {
    name: 'Claude Code',
    globalPath: path.join(HOME, '.claude', 'CLAUDE.md'),
    projectFile: 'CLAUDE.md',
    format: 'markdown',
    detect() {
      return fs.existsSync(path.join(HOME, '.claude'));
    },
  },
  cursor: {
    name: 'Cursor',
    globalPath: path.join(HOME, '.cursor', 'rules', 'antibluff.mdc'),
    projectFile: '.cursorrules',
    format: 'markdown',
    detect() {
      return (
        fs.existsSync(path.join(HOME, '.cursor')) ||
        fs.existsSync(path.join(HOME, 'AppData', 'Roaming', 'Cursor'))
      );
    },
  },
  gemini: {
    name: 'Gemini CLI',
    globalPath: path.join(HOME, '.gemini', 'GEMINI.md'),
    projectFile: 'GEMINI.md',
    format: 'markdown',
    detect() {
      return fs.existsSync(path.join(HOME, '.gemini'));
    },
  },
  copilot: {
    name: 'GitHub Copilot',
    globalPath: null,
    projectFile: path.join('.github', 'copilot-instructions.md'),
    format: 'markdown',
    detect() {
      return true; // Copilot is a VS Code/IDE extension, no global config dir to detect
    },
  },
  windsurf: {
    name: 'Windsurf',
    globalPath: path.join(HOME, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
    projectFile: '.windsurfrules',
    format: 'markdown',
    detect() {
      return (
        fs.existsSync(path.join(HOME, '.codeium')) ||
        fs.existsSync(path.join(HOME, '.windsurf'))
      );
    },
  },
  aider: {
    name: 'Aider',
    globalPath: null,
    projectFile: '.aider.conventions.md',
    format: 'markdown',
    detect() {
      try {
        const { execSync } = require('child_process');
        execSync('aider --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
  },
};

function getToolIds() {
  return Object.keys(TOOLS);
}

function getTool(id) {
  return TOOLS[id] || null;
}

function detectInstalledTools() {
  const detected = [];
  for (const [id, tool] of Object.entries(TOOLS)) {
    if (tool.detect()) {
      detected.push(id);
    }
  }
  return detected;
}

function resolveConfigPath(toolId, scope) {
  const tool = TOOLS[toolId];
  if (!tool) return null;

  if (scope === 'global') {
    return tool.globalPath;
  }

  return tool.projectFile ? path.resolve(process.cwd(), tool.projectFile) : null;
}

module.exports = {
  TOOLS,
  getToolIds,
  getTool,
  detectInstalledTools,
  resolveConfigPath,
};
