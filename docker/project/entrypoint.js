import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { planProjectRun } from './run-plan.js';

const LOCKFILE_NAMES = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
];

const projectDir = process.env.PROJECT_DIR || '/workspace';

try {
  process.chdir(projectDir);
} catch (error) {
  console.error(`bolt-project: cannot access ${projectDir}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

function commandExists(command) {
  if (!command || command.includes('/')) {
    return existsSync(command);
  }

  const result = spawnSync('which', [command], { stdio: 'ignore' });
  return result.status === 0;
}

function missingProject() {
  console.error(`bolt-project: no package.json in ${process.cwd()}.`);
  console.error('Mount a bolt project on /workspace. Example:');
  console.error('  docker run --rm -p 5174:5173 -v "$PWD":/workspace bolt-project:latest');
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      console.error(`bolt-project: failed to start ${command}: ${error.message}`);
      resolve(1);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === '--') {
    const [command, ...args] = argv.slice(1);

    if (!command) {
      console.error('bolt-project: expected a command after --');
      process.exit(1);
    }

    process.exit(await runCommand(command, args));
  }

  if (!existsSync('package.json')) {
    if (argv.length > 0 && commandExists(argv[0])) {
      process.exit(await runCommand(argv[0], argv.slice(1)));
    }

    missingProject();
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const scriptFromArg = argv[0] && !argv[0].startsWith('-') ? argv[0] : '';
  const userArgs = scriptFromArg ? argv.slice(1) : argv;

  if (scriptFromArg && !pkg.scripts?.[scriptFromArg]) {
    if (commandExists(scriptFromArg)) {
      process.exit(await runCommand(scriptFromArg, userArgs));
    }
  }

  const script = scriptFromArg || process.env.NPM_SCRIPT || 'dev';

  if (!pkg.scripts?.[script]) {
    const available = Object.keys(pkg.scripts || {});
    console.error(`bolt-project: package.json has no "${script}" script.`);

    if (available.length > 0) {
      console.error(`Available scripts: ${available.join(', ')}`);
    }

    process.exit(1);
  }

  const plan = planProjectRun(pkg, {
    script,
    port: process.env.PORT || '5173',
    lockfiles: LOCKFILE_NAMES.filter((name) => existsSync(name)),
    userArgs,
  });

  process.env.HOST = process.env.HOST || '0.0.0.0';
  process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
  process.env.PORT = plan.port;

  const installMode = process.env.INSTALL || 'auto';
  const shouldInstall = installMode === 'always' || (installMode === 'auto' && !existsSync('node_modules'));

  if (installMode !== 'never' && installMode !== 'auto' && installMode !== 'always') {
    console.error('bolt-project: INSTALL must be auto, always, or never');
    process.exit(1);
  }

  if (shouldInstall) {
    console.log(`bolt-project: ${plan.install.join(' ')}`);
    let installCode = await runCommand(plan.install[0], plan.install.slice(1));

    if (installCode !== 0 && plan.installFallback) {
      console.error('bolt-project: lockfile install failed, retrying without a frozen lockfile');
      console.log(`bolt-project: ${plan.installFallback.join(' ')}`);
      installCode = await runCommand(plan.installFallback[0], plan.installFallback.slice(1));
    }

    if (installCode !== 0) {
      process.exit(installCode);
    }
  }

  console.log(`bolt-project: ${plan.run.join(' ')}`);
  process.exit(await runCommand(plan.run[0], plan.run.slice(1)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
