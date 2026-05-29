# fox-api-kit

`fox-api-kit` 用于从 Apifox 获取接口详情，适合在开发前确认接口路径、请求参数、响应结构、枚举字段和接口说明。

## 环境变量

使用前需要配置 Apifox 访问令牌和项目映射：

```shell
export APIFOX_ACCESS_TOKEN="APS-xxx" # 在 Apifox 中创建你的个人访问密钥
export APIFOX_PROJECT_MAP="[{\"label\":\"projectName\",\"value\": 123}]"
```

### `APIFOX_ACCESS_TOKEN`

Apifox 的访问令牌。

### `APIFOX_PROJECT_MAP`

Apifox 项目映射，必须是 JSON 数组字符串：

```json
[
  {
    "label": "projectName",
    "value": 123
  }
]
```

- `label`：调用命令时使用的项目名。就是 `--projectName`
- `value`：Apifox 项目 ID。



## 更多说明

https://github.com/Byte-n/fox-api-kit
