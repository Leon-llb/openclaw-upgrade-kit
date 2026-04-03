# OpenClaw Upgrade Kit

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![Version](https://img.shields.io/github/v/tag/Leon-llb/openclaw-upgrade-kit?sort=semver)](https://github.com/Leon-llb/openclaw-upgrade-kit/tags)
[![License](https://img.shields.io/github/license/Leon-llb/openclaw-upgrade-kit)](./LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.4.1-0f766e)](./docs/install.md)
[![Profile](https://img.shields.io/badge/profile-solo--first-2563eb)](./docs/profiles.md)

让 OpenClaw 更接近真正严肃可用的编码智能体系统，而不只是“一个模型 + 一段提示词”的聊天壳。

这个仓库把我们从研究 Claude Code 工程模式里提炼出的高价值机制，重写并适配到了 OpenClaw：

- 分层本地长期记忆
- 成本感知的上下文注入
- 可持续的黑板交接机制
- `delegate / advisor / verification` 工作流闸门
- 渐进式 agent 配置档：`solo`、`duo`、`team5`
- 备份、校验、回滚一体化安装流程

默认优先支持单智能体。你不需要先搭五智能体，照样能获得明显提升。

## 适合谁用

- 你现在就是单智能体 OpenClaw，但想补上更好的规划、记忆和验证能力
- 你希望以后平滑升级到多智能体，而不是一次性重做整个系统
- 你希望安装、升级、回滚都可控，而不是手工改一堆 prompt 和配置
- 你想吸收 Claude Code 启发出来的工程机制，但不是机械照抄一套封闭系统

## 和原版 OpenClaw 的差异

| 维度 | 原版 OpenClaw | Upgrade Kit |
| --- | --- | --- |
| 默认工作形态 | 一个 agent + prompt + tools | workflow 分层 + 记忆 + 验证 |
| 记忆 | 主要停留在会话内 | 分层长期本地记忆 |
| 风险控制 | 靠 prompt 自觉 | advisor 与 verification gate |
| 交接方式 | 依赖长聊天历史 | 黑板产物可持续沉淀 |
| 多智能体演进 | 手工搭 | `solo -> duo -> team5` 渐进升级 |
| 安装方式 | 手工改 | backup、patch、verify、rollback |

## 为什么要做这个项目

很多 OpenClaw 配置只停留在：

- 一个模型
- 一段提示词
- 几个工具

但真正让编码智能体变得稳定、可靠、可长期使用的，往往不是模型本身，而是围绕模型建立的工程系统：

- 规划、执行、验证分层
- 跨会话保留的长期记忆
- 高风险任务的二审机制
- 可落盘的黑板产物，而不是无限堆叠聊天历史
- 从单智能体平滑进化到小团队协作的路由能力

这个仓库的目标，就是把这些能力做成用户可以直接安装的升级套件。

## 你会得到什么

### 1. `local-memory` v3.3.0

内置在 [`packages/local-memory`](./packages/local-memory)。

能力包括：

- 跨会话项目知识保留
- 用户偏好持续积累
- 五层长期记忆结构
- 自动归档与压缩
- 三级隐私
- 可视化仪表盘
- `/delegate`、`/advisor`、`/verify`
- 通过 `before_prompt_build` 注入 workflow gate 提示

### 2. 三档配置

- `solo`
  面向单智能体用户。保留一个 `main`，但引入结构化规划、二审和验证阶段。
- `duo`
  `main + warmaster`。适合想获得真实第二视角，但又不想维护五角色的人。
- `team5`
  `main / general / strategist / premier / warmaster`。完整协同版编码团队。

### 3. 更稳的安装流程

- 自动备份
- 在 `~/.openclaw/openclaw-upgrade/` 下生成工作区
- 正式插件安装记录
- 共享技能安装
- 黑板模板安装
- 安装后校验
- 一键回滚

## 单智能体优先

绝大多数用户建议先从 `solo` 开始。

- 它可以直接叠加在普通单智能体 OpenClaw 上
- 它会增加长期记忆和工作流纪律，但不会强迫你启用多智能体
- 之后如果你要升级到 `duo` 或 `team5`，也不需要从头重装

## 升级路线

1. 如果你现在只有一个 `main`，先上 `solo`。
2. 当你开始需要稳定的第二视角和挑错能力时，再升 `duo`。
3. 只有当你的任务长期需要研究、实现、执行、QA 分工时，再升 `team5`。

## 快速开始

### 直接从 GitHub 安装

```bash
npx github:Leon-llb/openclaw-upgrade-kit install --profile solo
```

### 克隆后安装

```bash
npm run build
node dist/cli.js install --profile solo
```

## 命令

```bash
openclaw-upgrade install --profile solo|duo|team5
openclaw-upgrade verify
openclaw-upgrade rollback --backup ~/.openclaw/backups/openclaw-upgrade-YYYYMMDDHHMMSS
```

## 安装流程

1. 备份 `~/.openclaw/openclaw.json` 和将被修改的插件、技能、工作区路径。
2. 安装 `local-memory`。
3. 复制共享 workflow skills。
4. 渲染黑板模板。
5. 渲染选定配置档的 agent 工作区。
6. Patch `openclaw.json`。
7. 重启 gateway。
8. 校验插件健康、安装形态和技能是否到位。

## 仓库结构

- [`src`](./src)：CLI 和安装器
- [`packages/local-memory`](./packages/local-memory)：内置分层记忆插件
- [`skills`](./skills)：共享工作流技能
- [`templates`](./templates)：角色模板和黑板模板
- [`docs`](./docs)：架构与安装文档

## 文档

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/profiles.md`](./docs/profiles.md)
- [`docs/install.md`](./docs/install.md)
- [`docs/faq.md`](./docs/faq.md)
- [`docs/roadmap.md`](./docs/roadmap.md)

## 兼容性

- OpenClaw：已在 `2026.4.1` 验证
- Node：`>=18`
- Python：推荐 `>=3.10`

## License

MIT
