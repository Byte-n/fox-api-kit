---
name: fox-api-kit
description: 在需要获取接口详情、接口定义、API 规范、查看某个接口的请求/响应结构时触发。无论是用户主动要求，还是在完成任务过程中需要了解某个接口的参数、返回值或数据结构，都应使用此技能来调用 fox-api-kit CLI。
---

# fox-api-kit CLI

## 步骤 1：识别 project-name 参数

‘API’ 与 ‘接口’ 为等价关键词。

`--project-name` 是可选参数。优先按以下规则识别，命中即视为指定：

1. 显式关键词「项目/项目名/应用/服务/系统/后台/端」+ 名词短语。
2. 归属结构：例如 `X的接口`、`X接口`、`X path/`、`X项目里的接口`、`X下的接口`、`在X中查接口` → 取 `X`。
3. 参数结构：`--project-name X`、`-p X`、`project-name=X` → 取参数值。
4. 上下文继承：前文已确定 `project-name`，后续只给接口路径 → 沿用最近一次明确值。
5. 业务域识别：当用户使用稳定业务域名称指代项目，且语义上明确是在该域下查接口时，将该业务域名称直接作为 `project-name`。
6. 多接口共属：多个 `path` 由同一个名称管辖 → 对每个 `path` 复用该 `project-name`。
7. 只有环境名、域名、接口名，或无法稳定抽取 → 可以省略 `--project-name` 直接调用；如果 CLI 提示存在多个可选项目，再询问用户。

抽到的 `project-name`：去首尾空白与包裹引号；保留原文大小写、标点、空格、中英文；不翻译/改写/补全。未抽到 `project-name` 时不要臆测补全。

## 步骤 2：调用命令

根据步骤 1 的识别结果选择命令：

- 已识别到 project-name 时：

```bash
npx -y fox-api-kit@latest api-detail -p <project-name> --path <api-path>
```

- 未识别到 project-name 时：

```bash
npx -y fox-api-kit@latest api-detail --path <api-path>
```
