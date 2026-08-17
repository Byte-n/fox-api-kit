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

## 命令

### `list-projects`

通过 Apifox 开放 API 列出当前 `APIFOX_ACCESS_TOKEN` 可访问的所有项目（跨团队聚合，返回项目 ID、名称及所属团队）。

```bash
fox-api-kit list-projects
```

### `search-apis`

跨全部可访问项目按关键字模糊搜索接口（匹配接口名称或路径，不区分大小写）。

```bash
fox-api-kit search-apis -k <关键词>
```

| 选项 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--keyword` | `-k` | 是 | 搜索关键词（匹配接口名称或路径） |
| `--method` | `-m` | 否 | 按 HTTP 方法过滤 |

### `api-detail`

获取指定接口的完整 OpenAPI 3.1.0 规范详情。

```bash
fox-api-kit api-detail --path <API路径>
```

| 选项 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--project-name` | `-p` | 否 | 项目名称；可访问项目仅一个时会自动使用该项目 |
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
