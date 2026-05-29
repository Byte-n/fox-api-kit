---
name: fox-api-kit
description: 在前端开发、联调、排查或评审中需要查询 Apifox 接口详情时使用；适用于获取接口路径对应的请求参数、响应结构、枚举字段、接口说明和项目内 API 定义。用户主动要求查接口、接口定义、API 规范，或任务过程中需要确认某个接口的数据结构时触发。
metadata:
  pattern: tool-wrapper
  version: "1.0.0"
---

# fox-api-kit CLI

用于根据接口路径快速查询 Apifox 接口详情，补全联调与排查所需的请求、响应与字段说明信息。

## 适用范围

- 前端开发、接口联调、问题排查、代码评审中需要查询 Apifox 接口详情时。
- 用户明确提到「API」「接口」「接口定义」「API 规范」等需求时（“API”与“接口”为等价关键词）。
- 任务过程中需要确认某个接口的请求参数、响应结构、枚举字段、接口说明或项目内 API 定义时。

## 使用流程

### 步骤 1：识别 project-name 参数

`--project-name` 参数，按以下规则识别，命中即视为指定：

1. 显式关键词「项目/项目名/应用/服务/系统/后台/端」+ 名词短语。
2. 归属结构：例如 `X的接口`、`X接口`、`X path/`、`X项目里的接口`、`X下的接口`、`在X中查接口` → 取 `X`。
3. 参数结构：`--project-name X`、`-p X`、`project-name=X` → 取参数值。
4. 上下文继承：前文已确定 `project-name`，后续只给接口路径 → 沿用最近一次明确值。
5. 业务域识别：当用户使用稳定业务域名称指代项目，且语义上明确是在该域下查接口时，将该业务域名称直接作为 `project-name`。
6. 多接口共属：多个 `path` 由同一个名称管辖 → 对每个 `path` 复用该 `project-name`。
7. 只有环境名、域名、接口名，或无法稳定抽取 → 可以省略 `--project-name` 直接调用；如果 CLI 提示存在多个可选项目，再询问用户。

抽到的 `project-name`：去首尾空白与包裹引号；保留原文大小写、标点、空格、中英文；不翻译/改写/补全。未抽到 `project-name` 时不要臆测补全。

### 步骤 2：调用命令

根据步骤 1 的识别结果选择命令：

- 已识别到 project-name 时：

```bash
npx -y fox-api-kit@latest api-detail -p <project-name> --path <api-path>
```

- 未识别到 project-name 时：

```bash
npx -y fox-api-kit@latest api-detail --path <api-path>
```
