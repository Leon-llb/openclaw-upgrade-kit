import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

export type Profile = 'solo' | 'duo' | 'team5';
type KnownAgentId = 'main' | 'general' | 'strategist' | 'premier' | 'warmaster';

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

type InstallOptions = {
  profile: Profile;
  sourceRoot?: string;
  stateDir?: string;
  workspaceRoot?: string;
  blackboardRoot?: string;
  openclawBin?: string;
  dryRun?: boolean;
  restartGateway?: boolean;
  logger?: Logger;
};

type VerifyOptions = {
  profile?: Profile;
  stateDir?: string;
  openclawBin?: string;
  serviceUrl?: string;
  logger?: Logger;
};

type RollbackOptions = {
  backupDir: string;
  logger?: Logger;
};

type InstallResult = {
  backupDir: string;
  stateDir: string;
  profile: Profile;
  workspaceRoot: string;
  blackboardRoot: string;
  pluginInstallPath: string;
  serviceUrl: string;
  verification: VerifyResult;
};

type VerifyResult = {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
};

type InstallManifestEntry = {
  path: string;
  existed: boolean;
  backupPath?: string;
};

type InstallManifest = {
  createdAt: string;
  stateDir: string;
  profile: Profile;
  pluginId: string;
  blackboardRoot: string;
  workspaceRoot: string;
  entries: InstallManifestEntry[];
};

type AgentPlan = {
  id: KnownAgentId;
  workspace: string;
  agentDir: string;
  templateProfile: Profile;
  templateName: string;
  allowAgents?: KnownAgentId[];
};

type InstallPaths = {
  stateDir: string;
  configPath: string;
  backupDir: string;
  pluginSourcePath: string;
  pluginInstallPath: string;
  skillsSourceRoot: string;
  skillsInstallRoot: string;
  blackboardTemplateSource: string;
  blackboardTemplateInstall: string;
  workspaceRoot: string;
  blackboardRoot: string;
};

const PLUGIN_ID = 'local-memory';
const SKILL_IDS = [
  'openclaw-delegation',
  'openclaw-advisor-gate',
  'openclaw-verification-gate',
] as const;
const SERVICE_URL = 'http://127.0.0.1:37888';
const DEFAULT_PLUGIN_VERSION = '3.3.0';
const KNOWN_AGENT_ORDER: KnownAgentId[] = [
  'main',
  'general',
  'strategist',
  'premier',
  'warmaster',
];

const defaultLogger: Logger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expandHome(targetPath: string): string {
  if (targetPath === '~') {
    return os.homedir();
  }
  if (targetPath.startsWith('~/')) {
    return path.join(os.homedir(), targetPath.slice(2));
  }
  return targetPath;
}

function timestampForDir(date = new Date()): string {
  return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function safeFileSlug(filePath: string): string {
  return filePath.replace(/[\\/]/g, '__').replace(/[^A-Za-z0-9._-]+/g, '_');
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function copyPath(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
  });
}

async function removePath(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): { ok: boolean; stdout: string; stderr: string; code: number | null } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    code: result.status,
  };
}

async function waitForHttpOk(url: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function inferPluginVersion(sourceRoot: string): string {
  try {
    const packageJson = require(path.join(sourceRoot, 'packages', 'local-memory', 'package.json')) as {
      version?: string;
    };
    return packageJson.version || DEFAULT_PLUGIN_VERSION;
  } catch {
    return DEFAULT_PLUGIN_VERSION;
  }
}

function buildInstallPaths(options: InstallOptions): InstallPaths {
  const sourceRoot = options.sourceRoot || path.resolve(__dirname, '..');
  const stateDir = expandHome(options.stateDir || path.join(os.homedir(), '.openclaw'));
  const upgradeRoot = path.join(stateDir, 'openclaw-upgrade');
  const workspaceRoot = expandHome(options.workspaceRoot || path.join(upgradeRoot, 'workspaces'));
  const blackboardRoot = expandHome(options.blackboardRoot || path.join(upgradeRoot, 'blackboard'));
  return {
    stateDir,
    configPath: path.join(stateDir, 'openclaw.json'),
    backupDir: path.join(stateDir, 'backups', `openclaw-upgrade-${timestampForDir()}`),
    pluginSourcePath: path.join(sourceRoot, 'packages', 'local-memory'),
    pluginInstallPath: path.join(stateDir, 'extensions', PLUGIN_ID),
    skillsSourceRoot: path.join(sourceRoot, 'skills'),
    skillsInstallRoot: path.join(stateDir, 'skills'),
    blackboardTemplateSource: path.join(sourceRoot, 'templates', 'blackboard'),
    blackboardTemplateInstall: path.join(blackboardRoot, '_templates'),
    workspaceRoot,
    blackboardRoot,
  };
}

function baseModelFromConfig(config: Record<string, unknown>): unknown {
  const agents = (config.agents || {}) as Record<string, unknown>;
  const list = Array.isArray(agents.list) ? (agents.list as Array<Record<string, unknown>>) : [];
  const main = list.find((entry) => entry.id === 'main');
  if (main && Object.prototype.hasOwnProperty.call(main, 'model')) {
    return clone(main.model);
  }
  const defaults = (agents.defaults || {}) as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(defaults, 'model')) {
    return clone(defaults.model);
  }
  return 'openai-codex/gpt-5.4';
}

function buildAgentPlans(profile: Profile, workspaceRoot: string, stateDir: string): AgentPlan[] {
  const workspace = (name: string) => path.join(workspaceRoot, name);
  const agentDir = (name: string) => path.join(stateDir, 'agents', name, 'agent');

  if (profile === 'solo') {
    return [
      {
        id: 'main',
        workspace: workspace('solo-main'),
        agentDir: agentDir('main'),
        templateProfile: 'solo',
        templateName: 'main',
        allowAgents: [],
      },
    ];
  }

  if (profile === 'duo') {
    return [
      {
        id: 'main',
        workspace: workspace('duo-main'),
        agentDir: agentDir('main'),
        templateProfile: 'duo',
        templateName: 'main',
        allowAgents: ['warmaster'],
      },
      {
        id: 'warmaster',
        workspace: workspace('duo-warmaster'),
        agentDir: agentDir('warmaster'),
        templateProfile: 'duo',
        templateName: 'warmaster',
      },
    ];
  }

  return [
    {
      id: 'main',
      workspace: workspace('team5-main'),
      agentDir: agentDir('main'),
      templateProfile: 'team5',
      templateName: 'main',
      allowAgents: ['general', 'strategist', 'premier', 'warmaster'],
    },
    {
      id: 'general',
      workspace: workspace('team5-general'),
      agentDir: agentDir('general'),
      templateProfile: 'team5',
      templateName: 'general',
      allowAgents: ['general', 'strategist', 'premier', 'warmaster'],
    },
    {
      id: 'strategist',
      workspace: workspace('team5-strategist'),
      agentDir: agentDir('strategist'),
      templateProfile: 'team5',
      templateName: 'strategist',
    },
    {
      id: 'premier',
      workspace: workspace('team5-premier'),
      agentDir: agentDir('premier'),
      templateProfile: 'team5',
      templateName: 'premier',
    },
    {
      id: 'warmaster',
      workspace: workspace('team5-warmaster'),
      agentDir: agentDir('warmaster'),
      templateProfile: 'team5',
      templateName: 'warmaster',
    },
  ];
}

function sortAgents(list: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...list].sort((left, right) => {
    const leftId = typeof left.id === 'string' ? left.id : '';
    const rightId = typeof right.id === 'string' ? right.id : '';
    const leftIndex = KNOWN_AGENT_ORDER.indexOf(leftId as KnownAgentId);
    const rightIndex = KNOWN_AGENT_ORDER.indexOf(rightId as KnownAgentId);
    if (leftIndex === -1 && rightIndex === -1) {
      return leftId.localeCompare(rightId);
    }
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function applyInstallToConfig(params: {
  config: Record<string, unknown>;
  profile: Profile;
  plans: AgentPlan[];
  installPaths: InstallPaths;
  pluginVersion: string;
}): Record<string, unknown> {
  const next = clone(params.config);
  const plugins = ((next.plugins as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  next.plugins = plugins;
  const allow = Array.isArray(plugins.allow) ? [...(plugins.allow as string[])] : [];
  if (!allow.includes(PLUGIN_ID)) {
    allow.push(PLUGIN_ID);
  }
  plugins.allow = allow;
  const slots = ((plugins.slots as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  slots.memory = PLUGIN_ID;
  plugins.slots = slots;
  const entries = ((plugins.entries as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  entries[PLUGIN_ID] = {
    enabled: true,
    config: {
      serviceUrl: SERVICE_URL,
      autoStart: true,
      autoInject: true,
      autoReflect: true,
      autoWorkflowHints: true,
      autoArchive: true,
      archiveAfterDays: 14,
      archiveCheckIntervalMinutes: 360,
      injectTopK: 8,
      injectThreshold: 0.18,
      injectStrategy: 'auto',
      defaultVisibility: 'project',
      ttlDays: 180,
      healthCheckInterval: 60000,
      blackboardRoot: params.installPaths.blackboardRoot,
    },
  };
  plugins.entries = entries;
  const installs = ((plugins.installs as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  installs[PLUGIN_ID] = {
    source: 'path',
    sourcePath: params.installPaths.pluginSourcePath,
    installPath: params.installPaths.pluginInstallPath,
    version: params.pluginVersion,
    installedAt: new Date().toISOString(),
  };
  plugins.installs = installs;

  const agents = ((next.agents as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  next.agents = agents;
  const defaults = ((agents.defaults as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  agents.defaults = defaults;
  const existingModel = baseModelFromConfig(next);
  if (!Object.prototype.hasOwnProperty.call(defaults, 'model')) {
    defaults.model = clone(existingModel);
  }
  defaults.workspace = params.plans[0].workspace;
  const currentSubagents = ((defaults.subagents as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  defaults.subagents = {
    maxConcurrent: 8,
    maxSpawnDepth: params.profile === 'solo' ? 1 : 2,
    maxChildrenPerAgent: params.profile === 'solo' ? 1 : 4,
    runTimeoutSeconds: 900,
    ...currentSubagents,
  };
  if (!Object.prototype.hasOwnProperty.call(defaults, 'maxConcurrent')) {
    defaults.maxConcurrent = params.profile === 'team5' ? 4 : 2;
  }

  const list = Array.isArray(agents.list) ? (agents.list as Array<Record<string, unknown>>) : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const agent of list) {
    if (agent && typeof agent.id === 'string') {
      byId.set(agent.id, clone(agent));
    }
  }
  for (const plan of params.plans) {
    const existing = byId.get(plan.id) || { id: plan.id, name: plan.id };
    existing.workspace = plan.workspace;
    existing.agentDir = plan.agentDir;
    if (!Object.prototype.hasOwnProperty.call(existing, 'model')) {
      existing.model = clone(existingModel);
    }
    existing.tools = {
      ...(((existing.tools as Record<string, unknown> | undefined) || {}) as Record<string, unknown>),
      profile: 'full',
    };
    if (plan.allowAgents) {
      existing.subagents = {
        ...(((existing.subagents as Record<string, unknown> | undefined) || {}) as Record<string, unknown>),
        allowAgents: plan.allowAgents,
      };
    } else if (existing.subagents && typeof existing.subagents === 'object') {
      const updatedSubagents = {
        ...((existing.subagents as Record<string, unknown>) || {}),
      };
      delete updatedSubagents.allowAgents;
      if (Object.keys(updatedSubagents).length > 0) {
        existing.subagents = updatedSubagents;
      } else {
        delete existing.subagents;
      }
    }
    byId.set(plan.id, existing);
  }
  agents.list = sortAgents(Array.from(byId.values()));
  return next;
}

function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => variables[key] || '');
}

async function renderDirectory(
  sourceDir: string,
  destinationDir: string,
  variables: Record<string, string>,
): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  await ensureDir(destinationDir);
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      await renderDirectory(sourcePath, destinationPath, variables);
      continue;
    }
    const raw = await fs.readFile(sourcePath, 'utf8');
    await fs.writeFile(destinationPath, renderTemplate(raw, variables), 'utf8');
  }
}

async function recordBackup(
  manifest: InstallManifest,
  backupRoot: string,
  targetPath: string,
): Promise<void> {
  const existed = await pathExists(targetPath);
  if (!existed) {
    manifest.entries.push({ path: targetPath, existed: false });
    return;
  }
  await ensureDir(backupRoot);
  const backupPath = path.join(backupRoot, safeFileSlug(targetPath));
  await copyPath(targetPath, backupPath);
  manifest.entries.push({
    path: targetPath,
    existed: true,
    backupPath,
  });
}

async function installPluginViaCliOrFallback(
  openclawBin: string,
  installPaths: InstallPaths,
  sourceRoot: string,
  logger: Logger,
): Promise<void> {
  const cliInstall = runCommand(
    openclawBin,
    ['plugins', 'install', installPaths.pluginSourcePath],
    sourceRoot,
  );
  if (cliInstall.ok) {
    logger.info('[openclaw-upgrade] Installed local-memory via `openclaw plugins install`');
    return;
  }

  logger.warn('[openclaw-upgrade] Official plugin install failed, falling back to direct copy');
  logger.warn(cliInstall.stderr.trim() || cliInstall.stdout.trim() || 'unknown plugin install failure');
  await removePath(installPaths.pluginInstallPath);
  await ensureDir(path.dirname(installPaths.pluginInstallPath));
  await copyPath(installPaths.pluginSourcePath, installPaths.pluginInstallPath);
}

async function installSkills(
  installPaths: InstallPaths,
  variables: Record<string, string>,
): Promise<void> {
  await ensureDir(installPaths.skillsInstallRoot);
  for (const skillId of SKILL_IDS) {
    const sourceDir = path.join(installPaths.skillsSourceRoot, skillId);
    const destinationDir = path.join(installPaths.skillsInstallRoot, skillId);
    await removePath(destinationDir);
    await renderDirectory(sourceDir, destinationDir, variables);
  }
}

async function installBlackboardTemplates(
  installPaths: InstallPaths,
  variables: Record<string, string>,
): Promise<void> {
  await removePath(installPaths.blackboardTemplateInstall);
  await renderDirectory(
    installPaths.blackboardTemplateSource,
    installPaths.blackboardTemplateInstall,
    variables,
  );
}

async function installAgentWorkspaces(
  sourceRoot: string,
  plans: AgentPlan[],
  variables: Record<string, string>,
): Promise<void> {
  for (const plan of plans) {
    const templateDir = path.join(
      sourceRoot,
      'templates',
      'agents',
      plan.templateProfile,
      plan.templateName,
    );
    await removePath(plan.workspace);
    await renderDirectory(templateDir, plan.workspace, {
      ...variables,
      ROLE_ID: plan.id,
      AGENT_WORKSPACE: plan.workspace,
    });
    await ensureDir(plan.agentDir);
  }
}

async function loadOpenClawConfig(configPath: string): Promise<Record<string, unknown>> {
  if (!(await pathExists(configPath))) {
    return {};
  }
  return readJson<Record<string, unknown>>(configPath);
}

function extractServiceUrl(config: Record<string, unknown>): string {
  const plugins = ((config.plugins as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const entries = ((plugins.entries as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const localMemory = ((entries[PLUGIN_ID] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const localMemoryConfig = ((localMemory.config as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  return typeof localMemoryConfig.serviceUrl === 'string' ? localMemoryConfig.serviceUrl : SERVICE_URL;
}

export async function verifyInstall(options: VerifyOptions): Promise<VerifyResult> {
  const logger = options.logger || defaultLogger;
  const stateDir = expandHome(options.stateDir || path.join(os.homedir(), '.openclaw'));
  const configPath = path.join(stateDir, 'openclaw.json');
  const openclawBin = options.openclawBin || 'openclaw';
  const checks: VerifyResult['checks'] = [];
  const config = await loadOpenClawConfig(configPath);
  const serviceUrl = options.serviceUrl || extractServiceUrl(config);
  const plugins = ((config.plugins as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const entries = ((plugins.entries as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const localMemory = ((entries[PLUGIN_ID] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const pluginEnabled = Boolean(localMemory.enabled);
  checks.push({
    name: 'plugin-enabled',
    ok: pluginEnabled,
    detail: pluginEnabled ? 'local-memory is enabled in openclaw.json' : 'local-memory is not enabled',
  });

  const pluginInstallPath = path.join(stateDir, 'extensions', PLUGIN_ID);
  const pluginDirExists = await pathExists(pluginInstallPath);
  checks.push({
    name: 'plugin-files',
    ok: pluginDirExists,
    detail: pluginDirExists ? pluginInstallPath : 'local-memory extension directory missing',
  });

  const blackboardRoot = ((localMemory.config as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const blackboardPath =
    typeof blackboardRoot.blackboardRoot === 'string' ? blackboardRoot.blackboardRoot : '';
  checks.push({
    name: 'blackboard-root',
    ok: Boolean(blackboardPath),
    detail: blackboardPath || 'blackboardRoot is missing from plugin config',
  });

  for (const skillId of SKILL_IDS) {
    const skillPath = path.join(stateDir, 'skills', skillId, 'SKILL.md');
    const exists = await pathExists(skillPath);
    checks.push({
      name: `skill-${skillId}`,
      ok: exists,
      detail: exists ? skillPath : `${skillId} is missing`,
    });
  }

  const inspectResult = runCommand(openclawBin, ['plugins', 'inspect', PLUGIN_ID], stateDir);
  checks.push({
    name: 'plugin-inspect',
    ok: inspectResult.ok,
    detail: inspectResult.ok
      ? 'openclaw plugins inspect local-memory passed'
      : (inspectResult.stderr.trim() || inspectResult.stdout.trim() || 'plugin inspect failed'),
  });

  const doctorResult = runCommand(openclawBin, ['plugins', 'doctor'], stateDir);
  checks.push({
    name: 'plugin-doctor',
    ok: doctorResult.ok,
    detail: doctorResult.ok
      ? 'openclaw plugins doctor passed'
      : (doctorResult.stderr.trim() || doctorResult.stdout.trim() || 'plugin doctor failed'),
  });

  const healthOk = await waitForHttpOk(`${serviceUrl}/health`, 12000);
  checks.push({
    name: 'memory-service-health',
    ok: healthOk,
    detail: healthOk ? `${serviceUrl}/health` : `${serviceUrl}/health not ready`,
  });

  const ok = checks.every((check) => check.ok);
  if (!ok) {
    logger.warn('[openclaw-upgrade] Verification found at least one failed check');
  }
  return { ok, checks };
}

export async function installProfile(options: InstallOptions): Promise<InstallResult> {
  const logger = options.logger || defaultLogger;
  const sourceRoot = options.sourceRoot || path.resolve(__dirname, '..');
  const openclawBin = options.openclawBin || 'openclaw';
  const installPaths = buildInstallPaths({
    ...options,
    sourceRoot,
  });
  const pluginVersion = inferPluginVersion(sourceRoot);
  const existingConfig = await loadOpenClawConfig(installPaths.configPath);
  const plans = buildAgentPlans(options.profile, installPaths.workspaceRoot, installPaths.stateDir);
  const manifest: InstallManifest = {
    createdAt: new Date().toISOString(),
    stateDir: installPaths.stateDir,
    profile: options.profile,
    pluginId: PLUGIN_ID,
    blackboardRoot: installPaths.blackboardRoot,
    workspaceRoot: installPaths.workspaceRoot,
    entries: [],
  };

  await ensureDir(installPaths.backupDir);
  const restoreRoot = path.join(installPaths.backupDir, 'restore');
  await recordBackup(manifest, restoreRoot, installPaths.configPath);
  await recordBackup(manifest, restoreRoot, installPaths.pluginInstallPath);
  for (const skillId of SKILL_IDS) {
    await recordBackup(
      manifest,
      restoreRoot,
      path.join(installPaths.skillsInstallRoot, skillId),
    );
  }
  await recordBackup(manifest, restoreRoot, installPaths.blackboardTemplateInstall);
  for (const plan of plans) {
    await recordBackup(manifest, restoreRoot, plan.workspace);
  }

  const variables = {
    BLACKBOARD_ROOT: installPaths.blackboardRoot,
    BLACKBOARD_TEMPLATE_ROOT: installPaths.blackboardTemplateInstall,
    PROFILE: options.profile,
    SERVICE_URL,
  };

  if (!options.dryRun) {
    await installPluginViaCliOrFallback(openclawBin, installPaths, sourceRoot, logger);
    await installSkills(installPaths, variables);
    await installBlackboardTemplates(installPaths, variables);
    await installAgentWorkspaces(sourceRoot, plans, variables);

    const updatedConfig = applyInstallToConfig({
      config: existingConfig,
      profile: options.profile,
      plans,
      installPaths,
      pluginVersion,
    });
    await writeJson(installPaths.configPath, updatedConfig);

    if (options.restartGateway !== false) {
      const gatewayResult = runCommand(openclawBin, ['gateway', 'restart'], sourceRoot);
      if (!gatewayResult.ok) {
        logger.warn('[openclaw-upgrade] Gateway restart failed');
        logger.warn(gatewayResult.stderr.trim() || gatewayResult.stdout.trim() || 'unknown gateway restart failure');
      }
    }
  }

  await writeJson(path.join(installPaths.backupDir, 'manifest.json'), manifest);
  const verification = options.dryRun
    ? { ok: true, checks: [{ name: 'dry-run', ok: true, detail: 'install skipped because --dry-run is set' }] }
    : await verifyInstall({
        profile: options.profile,
        stateDir: installPaths.stateDir,
        openclawBin,
        serviceUrl: SERVICE_URL,
        logger,
      });

  return {
    backupDir: installPaths.backupDir,
    stateDir: installPaths.stateDir,
    profile: options.profile,
    workspaceRoot: installPaths.workspaceRoot,
    blackboardRoot: installPaths.blackboardRoot,
    pluginInstallPath: installPaths.pluginInstallPath,
    serviceUrl: SERVICE_URL,
    verification,
  };
}

export async function rollbackInstall(options: RollbackOptions): Promise<void> {
  const logger = options.logger || defaultLogger;
  const backupDir = expandHome(options.backupDir);
  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = await readJson<InstallManifest>(manifestPath);
  for (const entry of manifest.entries) {
    if (entry.existed && entry.backupPath) {
      await removePath(entry.path);
      await copyPath(entry.backupPath, entry.path);
      logger.info(`[openclaw-upgrade] Restored ${entry.path}`);
      continue;
    }
    await removePath(entry.path);
    logger.info(`[openclaw-upgrade] Removed generated path ${entry.path}`);
  }
}

function formatCheckLine(check: { name: string; ok: boolean; detail: string }): string {
  return `${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`;
}

export function formatVerification(result: VerifyResult): string {
  return result.checks.map(formatCheckLine).join('\n');
}

export const __testHooks = {
  buildAgentPlans,
  applyInstallToConfig,
  renderTemplate,
  buildInstallPaths,
  SERVICE_URL,
  PLUGIN_ID,
  SKILL_IDS: [...SKILL_IDS],
};
