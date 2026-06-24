'use strict';

const { VERSION, PROMPT, hasAntibluff, injectPrompt, removePrompt, getInstalledVersion } = require('./prompt');
const { TOOLS, getTool, getToolIds, detectInstalledTools, resolveConfigPath } = require('./tools');
const { install, uninstall, update, status, installAll, uninstallAll } = require('./installer');

module.exports = {
  VERSION,
  PROMPT,
  hasAntibluff,
  injectPrompt,
  removePrompt,
  getInstalledVersion,
  TOOLS,
  getTool,
  getToolIds,
  detectInstalledTools,
  resolveConfigPath,
  install,
  uninstall,
  update,
  status,
  installAll,
  uninstallAll,
};
