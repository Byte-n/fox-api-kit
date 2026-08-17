# Changelog

本文件记录 fox-api-kit 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.1.1

### 新增

- `search-apis` 新增 `--project-name` 选项：指定项目名称时仅在该项目内检索，项目不存在时报错并列出可用项目名

### 变更

- 统一 fox-api-kit skill 工作流：搜索接口与获取接口详情均支持指定 `project-name`；未识别到 project-name 时搜索接口回退为跨全部项目聚合检索

## 0.1.0

### 新增

- `search-apis` 跨全部项目聚合搜索：自动拉取 token 可访问的全部项目（跨团队）并聚合模糊搜索，结果按 team → project → api 分组输出
- 新增 `list-projects` 命令，展示当前 token 可访问的项目
- 对 429 限流自动退避重试，提升稳定性

### 变更

- `search-apis` 移除 `--module` 过滤参数，改为支持按 HTTP 方法过滤
- 简化项目配置，移除 `APIFOX_PROJECT_MAP` 环境变量

## [0.0.2] - 2026-05-29

### 变更

- `search-apis` 和 `api-detail` 的 `--project-name` 参数改为可选
- 当 `APIFOX_PROJECT_MAP` 只有一个项目时，会直接自动使用该项目
- 当存在多个项目且未传 `--project-name` 时，提示可选项目并要求指定项目名
- 更新 fox-api-kit skill 文档，调整 `project-name` 识别和调用策略

## [0.0.1-beta.0] - 2025-05-20

### 新增

- `search-apis` 命令：按关键词搜索接口，支持模块和 HTTP 方法过滤
- `api-detail` 命令：获取指定接口的完整 OpenAPI 3.1.0 规范详情
- 通过 Apifox API 获取 OpenAPI 规范数据
- 自动递归解析 `$ref` 引用，支持嵌套引用和循环引用防护
- 自动提取 API 模块名（api / rpc 路径格式）
