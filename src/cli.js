'use strict';

const { install, uninstall, update, status, installAll, uninstallAll } = require('./installer');
const { getTool, getToolIds, detectInstalledTools } = require('./tools');
const { version } = require('../package.json');

const COLORS = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const flags = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--global' || arg === '-g') {
      flags.global = true;
    } else if (arg === '--project' || arg === '-p') {
      flags.project = true;
    } else if ((arg === '--tool' || arg === '-t') && i + 1 < args.length) {
      flags.tool = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--version' || arg === '-v') {
      flags.version = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

function printResult(result) {
  const icon = result.success ? COLORS.green('✓') : COLORS.yellow('→');
  console.log(`  ${icon} ${result.message}`);
}

function cmdInstall(flags) {
  const scope = flags.project ? 'project' : 'global';

  console.log();
  console.log(COLORS.bold(`AntiBluff — Installing (${scope})`));
  console.log();

  if (flags.tool) {
    const tool = getTool(flags.tool);
    if (!tool) {
      console.log(COLORS.red(`  Unknown tool: ${flags.tool}`));
      console.log(`  Available: ${getToolIds().join(', ')}`);
      process.exit(1);
    }
    printResult(install(flags.tool, scope));
  } else {
    const results = installAll(scope);
    const installed = results.filter((r) => r.success);

    if (installed.length === 0) {
      console.log(COLORS.yellow('  No tools detected. Use --tool <name> to install manually.'));
      console.log(`  Available: ${getToolIds().join(', ')}`);
    } else {
      results.forEach(printResult);
    }
  }

  console.log();
}

function cmdUninstall(flags) {
  console.log();
  console.log(COLORS.bold('AntiBluff — Uninstalling'));
  console.log();

  if (flags.tool) {
    const scope = flags.project ? 'project' : 'global';
    const tool = getTool(flags.tool);
    if (!tool) {
      console.log(COLORS.red(`  Unknown tool: ${flags.tool}`));
      process.exit(1);
    }
    printResult(uninstall(flags.tool, scope));
  } else {
    const results = uninstallAll();
    if (results.length === 0) {
      console.log(COLORS.yellow('  AntiBluff not found in any config files.'));
    } else {
      results.forEach(printResult);
    }
  }

  console.log();
}

function cmdUpdate(flags) {
  const scope = flags.project ? 'project' : 'global';

  console.log();
  console.log(COLORS.bold(`AntiBluff — Updating (${scope})`));
  console.log();

  if (flags.tool) {
    const tool = getTool(flags.tool);
    if (!tool) {
      console.log(COLORS.red(`  Unknown tool: ${flags.tool}`));
      console.log(`  Available: ${getToolIds().join(', ')}`);
      process.exit(1);
    }
    printResult(update(flags.tool, scope));
  } else {
    let found = false;
    for (const toolId of getToolIds()) {
      const result = update(toolId, scope);
      if (result.success || result.message.includes('not found')) {
        printResult(result);
        found = true;
      }
    }
    if (!found) {
      console.log(COLORS.yellow('  AntiBluff not found in any config files.'));
    }
  }

  console.log();
}

function cmdStatus() {
  const entries = status();

  console.log();
  console.log(COLORS.bold('AntiBluff — Status'));
  console.log();

  const maxToolLen = Math.max(...entries.map((e) => e.tool.length));

  for (const entry of entries) {
    const toolPad = entry.tool.padEnd(maxToolLen);
    const scopePad = entry.scope.padEnd(7);

    if (entry.installed) {
      const ver = entry.installedVersion ? COLORS.dim(` (v${entry.installedVersion})`) : '';
      console.log(`  ${COLORS.green('●')} ${toolPad}  ${scopePad}  ${COLORS.dim(entry.path)}${ver}`);
    } else if (entry.fileExists) {
      console.log(`  ${COLORS.yellow('○')} ${toolPad}  ${scopePad}  ${COLORS.dim(entry.path)}  ${COLORS.dim('(file exists, antibluff not installed)')}`);
    } else {
      console.log(`  ${COLORS.dim('○')} ${toolPad}  ${scopePad}  ${COLORS.dim(entry.path)}  ${COLORS.dim('(no file)')}`);
    }
  }

  console.log();
  console.log(`  ${COLORS.green('●')} installed  ${COLORS.yellow('○')} not installed  ${COLORS.dim('○')} no config file`);
  console.log();
}

function cmdList() {
  const detected = detectInstalledTools();

  console.log();
  console.log(COLORS.bold('AntiBluff — Supported Tools'));
  console.log();

  for (const toolId of getToolIds()) {
    const tool = getTool(toolId);
    const isDetected = detected.includes(toolId);
    const icon = isDetected ? COLORS.green('●') : COLORS.dim('○');
    const paddedId = toolId.padEnd(20);
    const label = isDetected ? COLORS.cyan(paddedId) : paddedId;
    const paddedName = `(${tool.name})`.padEnd(24);
    const name = COLORS.dim(paddedName);
    const scopes = [
      tool.globalPath ? 'global' : null,
      tool.projectFile ? 'project' : null,
    ]
      .filter(Boolean)
      .join(', ');

    console.log(`  ${icon} ${label} ${name} ${COLORS.dim(scopes)}`);
  }

  console.log();
  console.log(`  ${COLORS.green('●')} detected on this machine  ${COLORS.dim('○')} not detected`);
  console.log();
}

function cmdHelp() {
  console.log(`
${COLORS.bold('AntiBluff')} v${version}
Make AI coding agents honest. Stop hallucinations and unverified claims.

${COLORS.bold('Usage:')}
  antibluff install   [--global|-g] [--project|-p] [--tool|-t <name>]
  antibluff uninstall [--global|-g] [--project|-p] [--tool|-t <name>]
  antibluff update    [--global|-g] [--project|-p] [--tool|-t <name>]
  antibluff status
  antibluff list

${COLORS.bold('Commands:')}
  install     Add AntiBluff prompt to AI tool config files
  uninstall   Remove AntiBluff prompt from config files
  update      Update AntiBluff prompt to latest version
  status      Show installation status across all tools
  list        List supported tools and detection status

${COLORS.bold('Options:')}
  --global, -g     Target global/user config (default)
  --project, -p    Target project-level config in current directory
  --tool, -t       Target a specific tool (e.g., claude-code, cursor)

${COLORS.bold('Supported Tools:')}
  claude-code      Claude Code (~/.claude/CLAUDE.md)
  cursor           Cursor (.cursorrules)
  gemini           Gemini CLI (GEMINI.md)
  copilot          GitHub Copilot (.github/copilot-instructions.md)
  windsurf         Windsurf (.windsurfrules)
  aider            Aider (.aider.conventions.md)

${COLORS.bold('Examples:')}
  npx antibluff install                    Install globally for all detected tools
  npx antibluff install -t claude-code     Install for Claude Code only
  npx antibluff install --project          Install in current project for all tools
  npx antibluff status                     Check what's installed where
  npx antibluff uninstall                  Remove from everywhere
`);
}

function run(argv) {
  const { command, flags } = parseArgs(argv);

  if (flags.version) {
    console.log(version);
    return;
  }

  if (flags.help && command === 'help') {
    cmdHelp();
    return;
  }

  switch (command) {
    case 'install':
      cmdInstall(flags);
      break;
    case 'uninstall':
    case 'remove':
      cmdUninstall(flags);
      break;
    case 'update':
    case 'upgrade':
      cmdUpdate(flags);
      break;
    case 'status':
      cmdStatus();
      break;
    case 'list':
    case 'ls':
      cmdList();
      break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log(version);
      break;
    default:
      console.log(COLORS.red(`Unknown command: ${command}`));
      console.log('Run antibluff help for usage.');
      process.exit(1);
  }
}

module.exports = { run };
