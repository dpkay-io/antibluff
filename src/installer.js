'use strict';

const fs = require('fs');
const path = require('path');
const { PROMPT, hasAntibluff, injectPrompt, removePrompt, getInstalledVersion } = require('./prompt');
const { getTool, resolveConfigPath, detectInstalledTools, getToolIds } = require('./tools');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readFileOrEmpty(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function install(toolId, scope) {
  const tool = getTool(toolId);
  if (!tool) {
    return { success: false, message: `Unknown tool: ${toolId}` };
  }

  const configPath = resolveConfigPath(toolId, scope);
  if (!configPath) {
    return { success: false, message: `${tool.name} does not support ${scope} installation` };
  }

  const existing = readFileOrEmpty(configPath);

  if (hasAntibluff(existing)) {
    return { success: false, message: `AntiBluff already installed in ${configPath}` };
  }

  ensureDir(configPath);
  const updated = injectPrompt(existing, PROMPT);
  fs.writeFileSync(configPath, updated, 'utf8');

  return { success: true, message: `Installed to ${configPath}` };
}

function uninstall(toolId, scope) {
  const tool = getTool(toolId);
  if (!tool) {
    return { success: false, message: `Unknown tool: ${toolId}` };
  }

  const configPath = resolveConfigPath(toolId, scope);
  if (!configPath) {
    return { success: false, message: `${tool.name} does not support ${scope} installation` };
  }

  if (!fs.existsSync(configPath)) {
    return { success: false, message: `No config found at ${configPath}` };
  }

  const existing = fs.readFileSync(configPath, 'utf8');

  if (!hasAntibluff(existing)) {
    return { success: false, message: `AntiBluff not found in ${configPath}` };
  }

  const updated = removePrompt(existing);

  if (updated.trim().length === 0) {
    fs.unlinkSync(configPath);
    return { success: true, message: `Removed from ${configPath} (file was empty, deleted)` };
  }

  fs.writeFileSync(configPath, updated, 'utf8');
  return { success: true, message: `Removed from ${configPath}` };
}

function update(toolId, scope) {
  const tool = getTool(toolId);
  if (!tool) {
    return { success: false, message: `Unknown tool: ${toolId}` };
  }

  const configPath = resolveConfigPath(toolId, scope);
  if (!configPath) {
    return { success: false, message: `${tool.name} does not support ${scope} installation` };
  }

  if (!fs.existsSync(configPath)) {
    return { success: false, message: `No config found at ${configPath}` };
  }

  const existing = fs.readFileSync(configPath, 'utf8');

  if (!hasAntibluff(existing)) {
    return { success: false, message: `AntiBluff not found in ${configPath} — run install first` };
  }

  const updated = injectPrompt(existing, PROMPT);

  if (updated === existing) {
    return { success: true, message: `Already up to date in ${configPath}` };
  }

  fs.writeFileSync(configPath, updated, 'utf8');
  return { success: true, message: `Updated in ${configPath}` };
}

function status() {
  const results = [];

  for (const toolId of getToolIds()) {
    const tool = getTool(toolId);

    for (const scope of ['global', 'project']) {
      const configPath = resolveConfigPath(toolId, scope);
      if (!configPath) continue;

      const exists = fs.existsSync(configPath);
      const content = exists ? readFileOrEmpty(configPath) : '';
      const installed = exists && hasAntibluff(content);
      const installedVersion = installed ? getInstalledVersion(content) : null;

      results.push({
        tool: tool.name,
        toolId,
        scope,
        path: configPath,
        fileExists: exists,
        installed,
        installedVersion,
      });
    }
  }

  return results;
}

function installAll(scope) {
  const toolIds = scope === 'global' ? detectInstalledTools() : getToolIds();
  const results = [];

  for (const toolId of toolIds) {
    results.push({ toolId, ...install(toolId, scope) });
  }

  return results;
}

function uninstallAll() {
  const results = [];

  for (const toolId of getToolIds()) {
    for (const scope of ['global', 'project']) {
      const configPath = resolveConfigPath(toolId, scope);
      if (!configPath || !fs.existsSync(configPath)) continue;

      const existing = readFileOrEmpty(configPath);
      if (hasAntibluff(existing)) {
        results.push({ toolId, scope, ...uninstall(toolId, scope) });
      }
    }
  }

  return results;
}

module.exports = {
  install,
  uninstall,
  update,
  status,
  installAll,
  uninstallAll,
};
