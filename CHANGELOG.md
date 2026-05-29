# Changelog

本文件记录 fox-api-kit 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
