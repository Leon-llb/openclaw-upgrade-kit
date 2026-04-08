const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { __testHooks } = require('../dist/installer.js');

test('renderTemplate replaces known placeholders and drops unknown ones', () => {
  const rendered = __testHooks.renderTemplate(
    'blackboard={{BLACKBOARD_ROOT}} profile={{PROFILE}} missing={{UNKNOWN}}',
    {
      BLACKBOARD_ROOT: '/tmp/blackboard',
      PROFILE: 'solo',
    },
  );

  assert.equal(rendered, 'blackboard=/tmp/blackboard profile=solo missing=');
});

test('buildAgentPlans returns a single main agent for solo profile', () => {
  const plans = __testHooks.buildAgentPlans('solo', '/tmp/workspaces', '/tmp/state');

  assert.equal(plans.length, 1);
  assert.equal(plans[0].id, 'main');
  assert.deepEqual(plans[0].allowAgents, []);
  assert.match(plans[0].workspace, /solo-main$/);
});

test('applyInstallToConfig wires solo profile and plugin config', () => {
  const config = {
    agents: {
      defaults: {
        model: {
          primary: 'openai-codex/gpt-5.4',
        },
      },
      list: [
        {
          id: 'main',
          name: 'main',
          workspace: '/tmp/old-main',
          agentDir: '/tmp/old-agent-dir',
        },
      ],
    },
  };
  const installPaths = __testHooks.buildInstallPaths({
    profile: 'solo',
    stateDir: path.join(os.tmpdir(), 'openclaw-state'),
    sourceRoot: '/tmp/source-root',
  });
  const plans = __testHooks.buildAgentPlans('solo', installPaths.workspaceRoot, installPaths.stateDir);
  const next = __testHooks.applyInstallToConfig({
    config,
    profile: 'solo',
    plans,
    installPaths,
    pluginVersion: '3.3.0',
  });

  assert.equal(next.plugins.slots.memory, 'local-memory');
  assert.equal(next.plugins.entries['local-memory'].enabled, true);
  assert.equal(
    next.plugins.entries['local-memory'].config.blackboardRoot,
    installPaths.blackboardRoot,
  );
  assert.equal(next.agents.defaults.workspace, plans[0].workspace);
  assert.equal(next.agents.defaults.timeoutSeconds, 900);
  assert.equal(next.agents.defaults.subagents.announceTimeoutMs, 300000);
  assert.equal(next.agents.defaults.subagents.runTimeoutSeconds, 900);
  assert.deepEqual(next.agents.list[0].subagents.allowAgents, []);
});

test('applyInstallToConfig preserves explicit agent timeout', () => {
  const installPaths = __testHooks.buildInstallPaths({
    profile: 'solo',
    stateDir: path.join(os.tmpdir(), 'openclaw-state-existing-timeout'),
    sourceRoot: '/tmp/source-root',
  });
  const plans = __testHooks.buildAgentPlans('solo', installPaths.workspaceRoot, installPaths.stateDir);
  const next = __testHooks.applyInstallToConfig({
    config: {
      agents: {
        defaults: {
          model: {
            primary: 'openai-codex/gpt-5.4',
          },
          timeoutSeconds: 1200,
        },
        list: [],
      },
    },
    profile: 'solo',
    plans,
    installPaths,
    pluginVersion: '3.3.0',
  });

  assert.equal(next.agents.defaults.timeoutSeconds, 1200);
  assert.equal(next.agents.defaults.subagents.announceTimeoutMs, 300000);
  assert.equal(next.agents.defaults.subagents.runTimeoutSeconds, 900);
});

test('applyInstallToConfig adds full team5 agent layout', () => {
  const installPaths = __testHooks.buildInstallPaths({
    profile: 'team5',
    stateDir: path.join(os.tmpdir(), 'openclaw-state-team5'),
    sourceRoot: '/tmp/source-root',
  });
  const plans = __testHooks.buildAgentPlans('team5', installPaths.workspaceRoot, installPaths.stateDir);
  const next = __testHooks.applyInstallToConfig({
    config: {
      agents: {
        defaults: {
          model: 'minimax-cn/MiniMax-M2.7',
        },
        list: [],
      },
    },
    profile: 'team5',
    plans,
    installPaths,
    pluginVersion: '3.3.0',
  });

  const ids = next.agents.list.map((agent) => agent.id);
  assert.deepEqual(ids.slice(0, 5), ['main', 'general', 'strategist', 'premier', 'warmaster']);
  const main = next.agents.list.find((agent) => agent.id === 'main');
  const general = next.agents.list.find((agent) => agent.id === 'general');
  assert.deepEqual(main.subagents.allowAgents, ['general', 'strategist', 'premier', 'warmaster']);
  assert.deepEqual(general.subagents.allowAgents, ['general', 'strategist', 'premier', 'warmaster']);
  assert.equal(next.plugins.installs['local-memory'].version, '3.3.0');
});

test('main workspace templates use split durable context files instead of MEMORY.md', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const profiles = ['solo', 'duo', 'team5'];

  for (const profile of profiles) {
    const mainDir = path.join(repoRoot, 'templates', 'agents', profile, 'main');
    const agentsPath = path.join(mainDir, 'AGENTS.md');
    const soulPath = path.join(mainDir, 'SOUL.md');

    assert.equal(fs.existsSync(path.join(mainDir, 'IDENTITY.md')), true);
    assert.equal(fs.existsSync(path.join(mainDir, 'USER.md')), true);
    assert.equal(fs.existsSync(path.join(mainDir, 'MEMORY.md')), false);

    const agents = fs.readFileSync(agentsPath, 'utf8');
    const soul = fs.readFileSync(soulPath, 'utf8');

    assert.match(agents, /Do not assume a separate `MEMORY\.md` exists/);
    assert.match(agents, /memory\/YYYY-MM-DD\.md/);
    assert.match(soul, /do not create or expect a separate `MEMORY\.md`/i);
  }
});
