---
name: fox-api-kit
description: 在前端开发、联调、排查或评审中需要搜索或查询 Apifox 接口时使用。搜索：用户需要按关键字（接口名称或路径的一部分）模糊查找接口、不确定完整接口路径时；查询：获取接口路径对应的请求参数、响应结构、枚举字段、接口说明和项目内 API 定义。用户主动要求查/搜接口、接口定义、API 规范，或任务过程中需要确认某个接口的数据结构或先定位接口时触发。
metadata:
  pattern: tool-wrapper
  version: "1.0.0"
---

# fox-api-kit CLI

用于在 Apifox 中**搜索接口**（按名称/路径关键字模糊匹配）与**查询接口文档**（接口路径 → 请求/响应/字段说明）。

## 适用范围

- **搜索接口**：用户需要按关键字（可能是接口名称或接口路径的一部分）查找接口、不确定完整接口路径时。
- **查询接口文档**：前端开发、接口联调、问题排查、代码评审中需要查询 Apifox 接口详情时。
- 用户明确提到「API」「接口」「接口定义」「API 规范」等需求时（“API”与“接口”为等价关键词）。
- 任务过程中需要确认某个接口的请求参数、响应结构、枚举字段、接口说明或项目内 API 定义时。

---

## 搜索接口流程

当用户需要按关键字查找接口（给出的是接口名称或路径的一部分，而非完整路径）时使用。`search-apis` **跨全部项目**搜索，无需指定
`project-name`。

### 步骤 1：执行 `search-apis` 按关键字搜索

```bash
# 必填 -k，按关键字模糊匹配接口名称与路径（不区分大小写）
npx -y fox-api-kit@latest search-apis -k <keyword>

# 可选 -m 按 HTTP 方法过滤
npx -y fox-api-kit@latest search-apis -k <keyword> -m <GET|POST|PUT|DELETE|PATCH>
```

---

## 查询接口文档流程

### 步骤 1: 获取所有可用的 Apifox 「项目列表」

执行 `list-projects` 命令可获取当前用户所有的项目

```bash
npx -y fox-api-kit@latest list-projects
```

### 步骤 2：根据已有上下文信息从「项目列表」中确定 `project-name`

以步骤 1 获取的「项目列表」为唯一候选来源。先从当前上下文信息（用户当前消息、任务背景、前文已确定的信息）中推断候选项目，再与列表比对确定
`project-name`。**凡是无法唯一命中的情况，必须使用 `AskUserQuestion` 工具让用户从列表中选择，严禁自己猜测。**

1. 基于已有上下文推断候选项目名：
    - 显式关键词：「项目/项目名/应用/服务/系统/后台/端」+ 名词短语。
    - 归属结构：`X的接口`、`X接口`、`X path/`、`X项目里的接口`、`X下的接口`、`在X中查接口` → 取 `X`。
    - 参数结构：`--project-name X`、`-p X`、`project-name=X` → 取参数值。
    - 上下文继承：前文已确定 `project-name`，后续只给接口路径 → 沿用最近一次明确值。
    - 业务域识别：稳定的业务域名称仅作候选线索，仍需与列表比对命中。
    - 未识别出任何候选 → 直接跳到第 3 步，让用户从列表中选取。
2. 将候选名与步骤 1 列表中的 `name` 比对：
    - **唯一命中** → 直接确定为该项目的 `project-name`。
    - **多个命中**（Apifox 允许跨团队存在同名项目）→ 使用 `AskUserQuestion` 工具列出所有命中的同名候选（附团队名，如
      `项目名（团队名）`），让用户选择要用的那个。
    - **无命中** → 不得臆测列表之外的项目名，使用 `AskUserQuestion` 工具让用户从完整列表中挑选。
3. 选择项目时，`AskUserQuestion` 的选项必须来自步骤 1 的实际列表，不得伪造或凭空给出列表外的名称。用户选定后，取其 `name`
   （去首尾空白与包裹引号；保留原文大小写、标点、空格、中英文）作为 `project-name`。

> 若无 `AskUserQuestion` 工具，则使用其它类似的工具

### 步骤 3：调用命令

根据步骤 2 确定的结果选择命令：

- 已识别到 `project-name` 时：

```bash
npx -y fox-api-kit@latest api-detail -p <project-name> --path <api-path>
```

- 未识别到 `project-name` 时：

```bash
npx -y fox-api-kit@latest api-detail --path <api-path>
```
