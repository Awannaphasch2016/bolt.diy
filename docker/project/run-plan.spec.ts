import { describe, expect, it } from 'vitest';
import { planProjectRun } from './run-plan.js';

describe('planProjectRun', () => {
  it('installs a Vite project with pnpm and binds the dev server', () => {
    const plan = planProjectRun(
      {
        scripts: { dev: 'vite' },
        devDependencies: { vite: '^6.0.0' },
      },
      { lockfiles: ['pnpm-lock.yaml'], port: '5173' },
    );

    expect(plan.manager).toBe('pnpm');
    expect(plan.install).toEqual(['pnpm', 'install', '--frozen-lockfile']);
    expect(plan.installFallback).toEqual(['pnpm', 'install', '--no-frozen-lockfile']);
    expect(plan.run).toEqual(['pnpm', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173']);
  });

  it('uses npm ci for a Next.js project with a package lock', () => {
    const plan = planProjectRun(
      {
        scripts: { dev: 'next dev' },
        dependencies: { next: '^15.0.0', react: '^19.0.0' },
      },
      { lockfiles: ['package-lock.json'], port: '3000' },
    );

    expect(plan.manager).toBe('npm');
    expect(plan.install).toEqual(['npm', 'ci']);
    expect(plan.installFallback).toEqual(['npm', 'install']);
    expect(plan.run).toEqual(['npm', 'run', 'dev', '--', '-H', '0.0.0.0', '-p', '3000']);
  });

  it('uses yarn when a yarn lockfile is present', () => {
    const plan = planProjectRun(
      {
        scripts: { dev: 'vite' },
        devDependencies: { vite: '^6.0.0' },
      },
      { lockfiles: ['yarn.lock'] },
    );

    expect(plan.manager).toBe('yarn');
    expect(plan.install).toEqual(['yarn', 'install', '--frozen-lockfile']);
    expect(plan.installFallback).toEqual(['yarn', 'install']);
    expect(plan.run[0]).toBe('yarn');
    expect(plan.run).toContain('--host');
  });

  it('follows the packageManager field when no lockfile exists', () => {
    const plan = planProjectRun(
      {
        packageManager: 'pnpm@9.15.9',
        scripts: { dev: 'astro dev' },
        dependencies: { astro: '^5.0.0' },
      },
      {},
    );

    expect(plan.manager).toBe('pnpm');
    expect(plan.install).toEqual(['pnpm', 'install']);
    expect(plan.installFallback).toBeNull();
    expect(plan.run).toEqual(['pnpm', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173']);
  });

  it('binds Angular, Expo, and Slidev with their own flags', () => {
    expect(planProjectRun({ scripts: { dev: 'ng serve' }, dependencies: { '@angular/core': '^19.0.0' } }).run).toEqual([
      'npm',
      'run',
      'dev',
      '--',
      '--host',
      '0.0.0.0',
      '--port',
      '5173',
    ]);

    expect(planProjectRun({ scripts: { dev: 'expo start' }, dependencies: { expo: '~52.0.0' } }).run).toEqual([
      'npm',
      'run',
      'dev',
      '--',
      '--host',
      'lan',
      '--port',
      '5173',
    ]);

    expect(planProjectRun({ scripts: { dev: 'slidev' }, dependencies: { '@slidev/cli': '^51.0.0' } }).run).toEqual([
      'npm',
      'run',
      'dev',
      '--',
      '--remote',
      '--port',
      '5173',
    ]);
  });

  it('leaves custom scripts unchanged and appends user arguments', () => {
    const plan = planProjectRun(
      {
        scripts: { dev: 'node server.js', start: 'node server.js' },
      },
      { script: 'start', userArgs: ['--inspect'] },
    );

    expect(plan.installFallback).toBeNull();
    expect(plan.run).toEqual(['npm', 'run', 'start', '--', '--inspect']);
  });

  it('prefers a pnpm lockfile over another lockfile', () => {
    const plan = planProjectRun(
      { scripts: { dev: 'vite' }, devDependencies: { vite: '^6.0.0' } },
      { lockfiles: ['yarn.lock', 'pnpm-lock.yaml', 'not-a-lockfile'] },
    );

    expect(plan.manager).toBe('pnpm');
  });
});
