export interface ProjectPackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
}

export interface ProjectRunOptions {
  script?: string;
  port?: string;
  lockfiles?: string[];
  userArgs?: string[];
}

export interface ProjectRunPlan {
  manager: 'pnpm' | 'yarn' | 'npm';
  install: string[];
  installFallback: string[] | null;
  run: string[];
  script: string;
  port: string;
}

export function planProjectRun(pkg: ProjectPackageJson, options?: ProjectRunOptions): ProjectRunPlan;
