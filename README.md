# fox-api-kit

Apifox OpenAPI CLI 工具，用于从 Apifox 获取 OpenAPI 规范数据，支持搜索接口和获取接口详情。

## 安装

```bash
npm install -g fox-api-kit
# 或
pnpm add -g fox-api-kit
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `APIFOX_ACCESS_TOKEN` | Apifox API 访问令牌（必填） |
| `APIFOX_PROJECT_MAP` | 项目名称与 ID 的映射，JSON 数组格式（必填） |

`APIFOX_PROJECT_MAP` 示例：

```json
[{"label": "my-project", "value": 123456}]
```

## 命令

### `search-apis`

按关键词搜索接口列表。

```bash
fox-api-kit search-apis -p <项目名称> -k <关键词>
```

| 选项 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--project-name` | `-p` | 是 | 项目名称 |
| `--keyword` | `-k` | 是 | 搜索关键词 |
| `--module` | | 否 | 按模块过滤 |
| `--method` | `-m` | 否 | 按 HTTP 方法过滤 |

### `api-detail`

获取指定接口的完整 OpenAPI 3.1.0 规范详情。

```bash
fox-api-kit api-detail -p <项目名称> --path <API路径>
```

| 选项 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--project-name` | `-p` | 是 | 项目名称 |
| `--path` | | 是 | API 路径 |
| `--method` | `-m` | 否 | HTTP 方法（路径下仅有单个方法时可省略） |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建
pnpm build
```

## License

MIT
