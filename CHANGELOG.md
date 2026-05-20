# Changelog

本文件记录 fox-api-kit 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.0.1-beta.0] - 2025-05-20

### 新增

- `search-apis` 命令：按关键词搜索接口，支持模块和 HTTP 方法过滤
- `api-detail` 命令：获取指定接口的完整 OpenAPI 3.1.0 规范详情
- 通过 Apifox API 获取 OpenAPI 规范数据
- 自动递归解析 `$ref` 引用，支持嵌套引用和循环引用防护
- 自动提取 API 模块名（api / rpc 路径格式）
