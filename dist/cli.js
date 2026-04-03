#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const installer_1 = require("./installer");
function usage() {
    return [
        'OpenClaw Upgrade Kit',
        '',
        'Usage:',
        '  openclaw-upgrade install --profile solo|duo|team5 [--state-dir ~/.openclaw]',
        '  openclaw-upgrade verify [--state-dir ~/.openclaw]',
        '  openclaw-upgrade rollback --backup ~/.openclaw/backups/openclaw-upgrade-YYYYMMDDHHMMSS',
    ].join('\n');
}
function parseArgs(argv) {
    const [command = 'help', ...rest] = argv;
    const flags = {};
    for (let index = 0; index < rest.length; index += 1) {
        const part = rest[index];
        if (!part.startsWith('--')) {
            continue;
        }
        const raw = part.slice(2);
        const [key, directValue] = raw.split('=');
        if (typeof directValue === 'string') {
            flags[key] = directValue;
            continue;
        }
        const nextValue = rest[index + 1];
        if (nextValue && !nextValue.startsWith('--')) {
            flags[key] = nextValue;
            index += 1;
            continue;
        }
        flags[key] = true;
    }
    return { command, flags };
}
function parseProfile(value) {
    if (value === 'solo' || value === 'duo' || value === 'team5') {
        return value;
    }
    return 'solo';
}
async function main() {
    const parsed = parseArgs(process.argv.slice(2));
    const sourceRoot = path_1.default.resolve(__dirname, '..');
    if (parsed.command === 'help' || parsed.flags.help) {
        console.log(usage());
        return;
    }
    if (parsed.command === 'install') {
        const result = await (0, installer_1.installProfile)({
            profile: parseProfile(parsed.flags.profile),
            stateDir: typeof parsed.flags['state-dir'] === 'string' ? parsed.flags['state-dir'] : undefined,
            workspaceRoot: typeof parsed.flags['workspace-root'] === 'string'
                ? parsed.flags['workspace-root']
                : undefined,
            blackboardRoot: typeof parsed.flags['blackboard-root'] === 'string'
                ? parsed.flags['blackboard-root']
                : undefined,
            sourceRoot,
            dryRun: parsed.flags['dry-run'] === true,
        });
        console.log([
            `Profile: ${result.profile}`,
            `Backup: ${result.backupDir}`,
            `Workspace root: ${result.workspaceRoot}`,
            `Blackboard root: ${result.blackboardRoot}`,
            `Plugin install path: ${result.pluginInstallPath}`,
            '',
            (0, installer_1.formatVerification)(result.verification),
        ].join('\n'));
        process.exitCode = result.verification.ok ? 0 : 1;
        return;
    }
    if (parsed.command === 'verify') {
        const result = await (0, installer_1.verifyInstall)({
            stateDir: typeof parsed.flags['state-dir'] === 'string' ? parsed.flags['state-dir'] : undefined,
            serviceUrl: typeof parsed.flags['service-url'] === 'string' ? parsed.flags['service-url'] : undefined,
        });
        console.log((0, installer_1.formatVerification)(result));
        process.exitCode = result.ok ? 0 : 1;
        return;
    }
    if (parsed.command === 'rollback') {
        const backupDir = parsed.flags.backup;
        if (typeof backupDir !== 'string') {
            console.error('rollback requires --backup <path>');
            process.exitCode = 1;
            return;
        }
        await (0, installer_1.rollbackInstall)({ backupDir });
        console.log(`Rollback completed from ${backupDir}`);
        return;
    }
    console.log(usage());
    process.exitCode = 1;
}
void main();
