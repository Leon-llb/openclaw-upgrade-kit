"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__testHooks = void 0;
exports.verifyInstall = verifyInstall;
exports.installProfile = installProfile;
exports.rollbackInstall = rollbackInstall;
exports.formatVerification = formatVerification;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const PLUGIN_ID = 'local-memory';
const SKILL_IDS = [
    'openclaw-delegation',
    'openclaw-advisor-gate',
    'openclaw-verification-gate',
];
const SERVICE_URL = 'http://127.0.0.1:37888';
const DEFAULT_PLUGIN_VERSION = '3.3.0';
const KNOWN_AGENT_ORDER = [
    'main',
    'general',
    'strategist',
    'premier',
    'warmaster',
];
const defaultLogger = {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
};
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function expandHome(targetPath) {
    if (targetPath === '~') {
        return os_1.default.homedir();
    }
    if (targetPath.startsWith('~/')) {
        return path_1.default.join(os_1.default.homedir(), targetPath.slice(2));
    }
    return targetPath;
}
function timestampForDir(date = new Date()) {
    return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}
function safeFileSlug(filePath) {
    return filePath.replace(/[\\/]/g, '__').replace(/[^A-Za-z0-9._-]+/g, '_');
}
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function ensureDir(targetPath) {
    await fs_1.promises.mkdir(targetPath, { recursive: true });
}
async function copyPath(source, destination) {
    await fs_1.promises.cp(source, destination, {
        recursive: true,
        force: true,
        verbatimSymlinks: true,
    });
}
async function removePath(targetPath) {
    await fs_1.promises.rm(targetPath, { recursive: true, force: true });
}
async function readJson(filePath) {
    return JSON.parse(await fs_1.promises.readFile(filePath, 'utf8'));
}
async function writeJson(filePath, value) {
    await ensureDir(path_1.default.dirname(filePath));
    await fs_1.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function runCommand(command, args, cwd) {
    const result = (0, child_process_1.spawnSync)(command, args, {
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
async function waitForHttpOk(url, timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
                return true;
            }
        }
        catch {
            // ignore and retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
}
function inferPluginVersion(sourceRoot) {
    try {
        const packageJson = require(path_1.default.join(sourceRoot, 'packages', 'local-memory', 'package.json'));
        return packageJson.version || DEFAULT_PLUGIN_VERSION;
    }
    catch {
        return DEFAULT_PLUGIN_VERSION;
    }
}
function buildInstallPaths(options) {
    const sourceRoot = options.sourceRoot || path_1.default.resolve(__dirname, '..');
    const stateDir = expandHome(options.stateDir || path_1.default.join(os_1.default.homedir(), '.openclaw'));
    const upgradeRoot = path_1.default.join(stateDir, 'openclaw-upgrade');
    const workspaceRoot = expandHome(options.workspaceRoot || path_1.default.join(upgradeRoot, 'workspaces'));
    const blackboardRoot = expandHome(options.blackboardRoot || path_1.default.join(upgradeRoot, 'blackboard'));
    return {
        stateDir,
        configPath: path_1.default.join(stateDir, 'openclaw.json'),
        backupDir: path_1.default.join(stateDir, 'backups', `openclaw-upgrade-${timestampForDir()}`),
        pluginSourcePath: path_1.default.join(sourceRoot, 'packages', 'local-memory'),
        pluginInstallPath: path_1.default.join(stateDir, 'extensions', PLUGIN_ID),
        skillsSourceRoot: path_1.default.join(sourceRoot, 'skills'),
        skillsInstallRoot: path_1.default.join(stateDir, 'skills'),
        blackboardTemplateSource: path_1.default.join(sourceRoot, 'templates', 'blackboard'),
        blackboardTemplateInstall: path_1.default.join(blackboardRoot, '_templates'),
        workspaceRoot,
        blackboardRoot,
    };
}
function baseModelFromConfig(config) {
    const agents = (config.agents || {});
    const list = Array.isArray(agents.list) ? agents.list : [];
    const main = list.find((entry) => entry.id === 'main');
    if (main && Object.prototype.hasOwnProperty.call(main, 'model')) {
        return clone(main.model);
    }
    const defaults = (agents.defaults || {});
    if (Object.prototype.hasOwnProperty.call(defaults, 'model')) {
        return clone(defaults.model);
    }
    return 'openai-codex/gpt-5.4';
}
function buildAgentPlans(profile, workspaceRoot, stateDir) {
    const workspace = (name) => path_1.default.join(workspaceRoot, name);
    const agentDir = (name) => path_1.default.join(stateDir, 'agents', name, 'agent');
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
function sortAgents(list) {
    return [...list].sort((left, right) => {
        const leftId = typeof left.id === 'string' ? left.id : '';
        const rightId = typeof right.id === 'string' ? right.id : '';
        const leftIndex = KNOWN_AGENT_ORDER.indexOf(leftId);
        const rightIndex = KNOWN_AGENT_ORDER.indexOf(rightId);
        if (leftIndex === -1 && rightIndex === -1) {
            return leftId.localeCompare(rightId);
        }
        if (leftIndex === -1)
            return 1;
        if (rightIndex === -1)
            return -1;
        return leftIndex - rightIndex;
    });
}
function applyInstallToConfig(params) {
    const next = clone(params.config);
    const plugins = (next.plugins || {});
    next.plugins = plugins;
    const allow = Array.isArray(plugins.allow) ? [...plugins.allow] : [];
    if (!allow.includes(PLUGIN_ID)) {
        allow.push(PLUGIN_ID);
    }
    plugins.allow = allow;
    const slots = (plugins.slots || {});
    slots.memory = PLUGIN_ID;
    plugins.slots = slots;
    const entries = (plugins.entries || {});
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
    const installs = (plugins.installs || {});
    installs[PLUGIN_ID] = {
        source: 'path',
        sourcePath: params.installPaths.pluginSourcePath,
        installPath: params.installPaths.pluginInstallPath,
        version: params.pluginVersion,
        installedAt: new Date().toISOString(),
    };
    plugins.installs = installs;
    const agents = (next.agents || {});
    next.agents = agents;
    const defaults = (agents.defaults || {});
    agents.defaults = defaults;
    const existingModel = baseModelFromConfig(next);
    if (!Object.prototype.hasOwnProperty.call(defaults, 'model')) {
        defaults.model = clone(existingModel);
    }
    defaults.workspace = params.plans[0].workspace;
    const currentSubagents = (defaults.subagents || {});
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
    const list = Array.isArray(agents.list) ? agents.list : [];
    const byId = new Map();
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
            ...(existing.tools || {}),
            profile: 'full',
        };
        if (plan.allowAgents) {
            existing.subagents = {
                ...(existing.subagents || {}),
                allowAgents: plan.allowAgents,
            };
        }
        else if (existing.subagents && typeof existing.subagents === 'object') {
            const updatedSubagents = {
                ...(existing.subagents || {}),
            };
            delete updatedSubagents.allowAgents;
            if (Object.keys(updatedSubagents).length > 0) {
                existing.subagents = updatedSubagents;
            }
            else {
                delete existing.subagents;
            }
        }
        byId.set(plan.id, existing);
    }
    agents.list = sortAgents(Array.from(byId.values()));
    return next;
}
function renderTemplate(content, variables) {
    return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => variables[key] || '');
}
async function renderDirectory(sourceDir, destinationDir, variables) {
    const entries = await fs_1.promises.readdir(sourceDir, { withFileTypes: true });
    await ensureDir(destinationDir);
    for (const entry of entries) {
        const sourcePath = path_1.default.join(sourceDir, entry.name);
        const destinationPath = path_1.default.join(destinationDir, entry.name);
        if (entry.isDirectory()) {
            await renderDirectory(sourcePath, destinationPath, variables);
            continue;
        }
        const raw = await fs_1.promises.readFile(sourcePath, 'utf8');
        await fs_1.promises.writeFile(destinationPath, renderTemplate(raw, variables), 'utf8');
    }
}
async function recordBackup(manifest, backupRoot, targetPath) {
    const existed = await pathExists(targetPath);
    if (!existed) {
        manifest.entries.push({ path: targetPath, existed: false });
        return;
    }
    await ensureDir(backupRoot);
    const backupPath = path_1.default.join(backupRoot, safeFileSlug(targetPath));
    await copyPath(targetPath, backupPath);
    manifest.entries.push({
        path: targetPath,
        existed: true,
        backupPath,
    });
}
async function installPluginViaCliOrFallback(openclawBin, installPaths, sourceRoot, logger) {
    const cliInstall = runCommand(openclawBin, ['plugins', 'install', installPaths.pluginSourcePath], sourceRoot);
    if (cliInstall.ok) {
        logger.info('[openclaw-upgrade] Installed local-memory via `openclaw plugins install`');
        return;
    }
    logger.warn('[openclaw-upgrade] Official plugin install failed, falling back to direct copy');
    logger.warn(cliInstall.stderr.trim() || cliInstall.stdout.trim() || 'unknown plugin install failure');
    await removePath(installPaths.pluginInstallPath);
    await ensureDir(path_1.default.dirname(installPaths.pluginInstallPath));
    await copyPath(installPaths.pluginSourcePath, installPaths.pluginInstallPath);
}
async function installSkills(installPaths, variables) {
    await ensureDir(installPaths.skillsInstallRoot);
    for (const skillId of SKILL_IDS) {
        const sourceDir = path_1.default.join(installPaths.skillsSourceRoot, skillId);
        const destinationDir = path_1.default.join(installPaths.skillsInstallRoot, skillId);
        await removePath(destinationDir);
        await renderDirectory(sourceDir, destinationDir, variables);
    }
}
async function installBlackboardTemplates(installPaths, variables) {
    await removePath(installPaths.blackboardTemplateInstall);
    await renderDirectory(installPaths.blackboardTemplateSource, installPaths.blackboardTemplateInstall, variables);
}
async function installAgentWorkspaces(sourceRoot, plans, variables) {
    for (const plan of plans) {
        const templateDir = path_1.default.join(sourceRoot, 'templates', 'agents', plan.templateProfile, plan.templateName);
        await removePath(plan.workspace);
        await renderDirectory(templateDir, plan.workspace, {
            ...variables,
            ROLE_ID: plan.id,
            AGENT_WORKSPACE: plan.workspace,
        });
        await ensureDir(plan.agentDir);
    }
}
async function loadOpenClawConfig(configPath) {
    if (!(await pathExists(configPath))) {
        return {};
    }
    return readJson(configPath);
}
function extractServiceUrl(config) {
    const plugins = (config.plugins || {});
    const entries = (plugins.entries || {});
    const localMemory = (entries[PLUGIN_ID] || {});
    const localMemoryConfig = (localMemory.config || {});
    return typeof localMemoryConfig.serviceUrl === 'string' ? localMemoryConfig.serviceUrl : SERVICE_URL;
}
async function verifyInstall(options) {
    const logger = options.logger || defaultLogger;
    const stateDir = expandHome(options.stateDir || path_1.default.join(os_1.default.homedir(), '.openclaw'));
    const configPath = path_1.default.join(stateDir, 'openclaw.json');
    const openclawBin = options.openclawBin || 'openclaw';
    const checks = [];
    const config = await loadOpenClawConfig(configPath);
    const serviceUrl = options.serviceUrl || extractServiceUrl(config);
    const plugins = (config.plugins || {});
    const entries = (plugins.entries || {});
    const localMemory = (entries[PLUGIN_ID] || {});
    const pluginEnabled = Boolean(localMemory.enabled);
    checks.push({
        name: 'plugin-enabled',
        ok: pluginEnabled,
        detail: pluginEnabled ? 'local-memory is enabled in openclaw.json' : 'local-memory is not enabled',
    });
    const pluginInstallPath = path_1.default.join(stateDir, 'extensions', PLUGIN_ID);
    const pluginDirExists = await pathExists(pluginInstallPath);
    checks.push({
        name: 'plugin-files',
        ok: pluginDirExists,
        detail: pluginDirExists ? pluginInstallPath : 'local-memory extension directory missing',
    });
    const blackboardRoot = (localMemory.config || {});
    const blackboardPath = typeof blackboardRoot.blackboardRoot === 'string' ? blackboardRoot.blackboardRoot : '';
    checks.push({
        name: 'blackboard-root',
        ok: Boolean(blackboardPath),
        detail: blackboardPath || 'blackboardRoot is missing from plugin config',
    });
    for (const skillId of SKILL_IDS) {
        const skillPath = path_1.default.join(stateDir, 'skills', skillId, 'SKILL.md');
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
async function installProfile(options) {
    const logger = options.logger || defaultLogger;
    const sourceRoot = options.sourceRoot || path_1.default.resolve(__dirname, '..');
    const openclawBin = options.openclawBin || 'openclaw';
    const installPaths = buildInstallPaths({
        ...options,
        sourceRoot,
    });
    const pluginVersion = inferPluginVersion(sourceRoot);
    const existingConfig = await loadOpenClawConfig(installPaths.configPath);
    const plans = buildAgentPlans(options.profile, installPaths.workspaceRoot, installPaths.stateDir);
    const manifest = {
        createdAt: new Date().toISOString(),
        stateDir: installPaths.stateDir,
        profile: options.profile,
        pluginId: PLUGIN_ID,
        blackboardRoot: installPaths.blackboardRoot,
        workspaceRoot: installPaths.workspaceRoot,
        entries: [],
    };
    await ensureDir(installPaths.backupDir);
    const restoreRoot = path_1.default.join(installPaths.backupDir, 'restore');
    await recordBackup(manifest, restoreRoot, installPaths.configPath);
    await recordBackup(manifest, restoreRoot, installPaths.pluginInstallPath);
    for (const skillId of SKILL_IDS) {
        await recordBackup(manifest, restoreRoot, path_1.default.join(installPaths.skillsInstallRoot, skillId));
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
    await writeJson(path_1.default.join(installPaths.backupDir, 'manifest.json'), manifest);
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
async function rollbackInstall(options) {
    const logger = options.logger || defaultLogger;
    const backupDir = expandHome(options.backupDir);
    const manifestPath = path_1.default.join(backupDir, 'manifest.json');
    const manifest = await readJson(manifestPath);
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
function formatCheckLine(check) {
    return `${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`;
}
function formatVerification(result) {
    return result.checks.map(formatCheckLine).join('\n');
}
exports.__testHooks = {
    buildAgentPlans,
    applyInstallToConfig,
    renderTemplate,
    buildInstallPaths,
    SERVICE_URL,
    PLUGIN_ID,
    SKILL_IDS: [...SKILL_IDS],
};
