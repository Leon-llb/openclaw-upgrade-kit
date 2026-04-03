/**
 * OpenClaw Local Memory 插件 v3
 *
 * 设计目标：
 * 1. 跨会话项目知识保留
 * 2. 用户偏好持续积累
 * 3. 分层长期记忆 + agent_end 自动沉淀
 * 4. 成本感知注入策略
 * 5. 三级隐私（private / project / global）
 * 6. 可视化仪表盘
 */
interface PluginLogger {
    debug?: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
}
interface PluginServiceContext {
    config: Record<string, unknown>;
    workspaceDir?: string;
    stateDir: string;
    logger: PluginLogger;
}
interface PluginCommandContext {
    senderId?: string;
    channel: string;
    isAuthorizedSender: boolean;
    args?: string;
    commandBody: string;
    config: Record<string, unknown>;
}
type PluginCommandResult = string | {
    text: string;
} | {
    text: string;
    format?: string;
};
interface BeforeAgentStartEvent {
    prompt?: string;
}
interface BeforePromptBuildEvent {
    prompt?: string;
    messages?: unknown[];
}
interface BeforePromptBuildResult {
    prependContext?: string;
    systemPrompt?: string;
    prependSystemContext?: string;
    appendSystemContext?: string;
}
interface ToolResultPersistEvent {
    toolName?: string;
    params?: Record<string, unknown>;
    message?: {
        content?: Array<{
            type: string;
            text?: string;
        }>;
    };
}
interface AgentEndEvent {
    messages?: Array<{
        role: string;
        content: string | Array<{
            type: string;
            text?: string;
        }>;
    }>;
}
interface EventContext {
    sessionKey?: string;
    workspaceDir?: string;
    agentId?: string;
}
interface OpenClawPluginApi {
    id: string;
    name: string;
    version?: string;
    source: string;
    config: Record<string, unknown>;
    pluginConfig?: Record<string, unknown>;
    logger: PluginLogger;
    registerService: (service: {
        id: string;
        start: (ctx: PluginServiceContext) => void | Promise<void>;
        stop?: (ctx: PluginServiceContext) => void | Promise<void>;
    }) => void;
    registerMemoryRuntime?: (runtime: MemoryPluginRuntime) => void;
    registerCommand: (command: {
        name: string;
        description: string;
        acceptsArgs?: boolean;
        requireAuth?: boolean;
        handler: (ctx: PluginCommandContext) => PluginCommandResult | Promise<PluginCommandResult>;
    }) => void;
    on: ((event: 'before_prompt_build', callback: (event: BeforePromptBuildEvent, ctx: EventContext) => void | BeforePromptBuildResult | Promise<void | BeforePromptBuildResult>) => void) & ((event: 'before_agent_start', callback: (event: BeforeAgentStartEvent, ctx: EventContext) => void | Promise<void>) => void) & ((event: 'tool_result_persist', callback: (event: ToolResultPersistEvent, ctx: EventContext) => void | Promise<void>) => void) & ((event: 'agent_end', callback: (event: AgentEndEvent, ctx: EventContext) => void | Promise<void>) => void);
    injectContext?: (ctx: EventContext, content: string) => Promise<void>;
}
type InjectStrategy = 'auto' | 'lean' | 'balanced' | 'deep';
type Visibility = 'private' | 'project' | 'global';
type WorkflowGate = 'delegation' | 'advisor' | 'verification';
type WorkflowRisk = 'low' | 'medium' | 'high';
type WorkflowDecision = {
    gates: WorkflowGate[];
    risk: WorkflowRisk;
    reasons: string[];
    route: string[];
    signature: string;
};
type WorkflowArtifactKind = 'delegate' | 'advisor' | 'verify';
type MemoryProviderStatus = {
    backend: 'builtin' | 'qmd';
    provider: string;
    workspaceDir?: string;
    dbPath?: string;
    vector?: {
        enabled: boolean;
        available?: boolean;
    };
    custom?: Record<string, unknown>;
};
type MemoryEmbeddingProbeResult = {
    ok: boolean;
    error?: string;
};
type MemorySyncProgressUpdate = {
    completed: number;
    total: number;
    label?: string;
};
type MemorySearchResult = {
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: 'memory' | 'sessions';
    citation?: string;
};
interface MemorySearchManager {
    search(query: string, opts?: {
        maxResults?: number;
        minScore?: number;
        sessionKey?: string;
    }): Promise<MemorySearchResult[]>;
    readFile(params: {
        relPath: string;
        from?: number;
        lines?: number;
    }): Promise<{
        text: string;
        path: string;
    }>;
    status(): MemoryProviderStatus;
    sync?(params?: {
        reason?: string;
        force?: boolean;
        sessionFiles?: string[];
        progress?: (update: MemorySyncProgressUpdate) => void;
    }): Promise<void>;
    probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult>;
    probeVectorAvailability(): Promise<boolean>;
    close?(): Promise<void>;
}
interface MemoryPluginRuntime {
    getMemorySearchManager(params: {
        cfg: unknown;
        agentId: string;
        purpose?: 'default' | 'status';
    }): Promise<{
        manager: MemorySearchManager | null;
        error?: string;
    }>;
    resolveMemoryBackendConfig(params: {
        cfg: unknown;
        agentId: string;
    }): {
        backend: 'builtin' | 'qmd';
        qmd?: Record<string, unknown>;
    };
    closeAllMemorySearchManagers?(): Promise<void>;
}
interface RuntimeConfig {
    serviceUrl: string;
    autoStart: boolean;
    autoInject: boolean;
    autoReflect: boolean;
    autoWorkflowHints: boolean;
    autoArchive: boolean;
    archiveAfterDays: number;
    archiveCheckIntervalMinutes: number;
    injectTopK: number;
    injectThreshold: number;
    injectStrategy: InjectStrategy;
    scriptPath: string;
    dbPath: string;
    blackboardRoot: string;
    healthCheckInterval: number;
    ttlDays: number;
    defaultVisibility: Visibility;
}
declare function registerLocalMemoryPlugin(api: OpenClawPluginApi): void;
declare const _default: {
    id: string;
    name: string;
    description: string;
    kind: "memory";
    register: typeof registerLocalMemoryPlugin;
};
export default _default;
export declare const __testHooks: {
    getState(): {
        healthCheckActive: boolean;
        archiveActive: boolean;
        serviceReady: boolean;
        consecutiveFailures: number;
        healthCheckInFlight: boolean;
        archiveSweepInFlight: boolean;
        restartActive: boolean;
    };
    resetState(): void;
    setHooks(overrides: {
        checkHealth?: (serviceUrl: string) => Promise<boolean>;
        startService?: (config: RuntimeConfig, logger: PluginLogger) => Promise<boolean>;
        sleep?: (ms: number) => Promise<void>;
        archiveSweep?: (config: RuntimeConfig, logger: PluginLogger, workspaceDir?: string) => Promise<boolean>;
    }): void;
    resetHooks(): void;
    startHealthCheck(config: RuntimeConfig, logger?: PluginLogger): void;
    startArchiveSchedule(config: RuntimeConfig, logger?: PluginLogger): void;
    stopAll(logger?: PluginLogger): void;
    inferWorkflowDecision(prompt: string, messages?: unknown[]): WorkflowDecision;
    shouldInjectWorkflowDecision(sessionId: string, decision: WorkflowDecision): boolean;
    createWorkflowArtifact(params: {
        kind: WorkflowArtifactKind;
        body: string;
        taskId?: string;
        phase?: string;
        stage?: string;
    }): Promise<{
        taskId: string;
        filePath: string;
    }>;
    setBlackboardRoot(root: string): void;
    registerPlugin(api: OpenClawPluginApi): void;
};
