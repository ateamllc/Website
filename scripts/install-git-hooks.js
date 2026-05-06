#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MARKER = 'A Team Website carousel manifest hook';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
let hooksPath = '';

try {
  hooksPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim();
} catch {
  hooksPath = '';
}
const targetDir = hooksPath
  ? path.resolve(root, hooksPath)
  : path.join(root, '.git', 'hooks');

const hooks = ['pre-commit'];

fs.mkdirSync(targetDir, { recursive: true });

hooks.forEach((hookName) => {
  const source = path.join(root, 'githooks', hookName);
  const target = path.join(targetDir, hookName);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing hook template: ${source}`);
  }

  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, 'utf8');
    if (!existing.includes(MARKER)) {
      const backup = `${target}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      fs.copyFileSync(target, backup);
      console.log(`Backed up existing ${hookName} hook to ${path.relative(root, backup)}`);
    }
  }

  fs.copyFileSync(source, target);
  fs.chmodSync(target, 0o755);
  console.log(`Installed ${hookName} hook to ${path.relative(root, target)}`);
});
