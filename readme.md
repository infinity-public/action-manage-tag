# 自动创建和清理tag GitHub Action

此 GitHub Action 用于自动创建和清理tag，通常用于代码合并到主分支后创建tag备份。

## 使用方法

在您的工作流 YAML 文件中使用该 Action：

```yaml
name: Manage Tag

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  ManageTag:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    permissions:
      contents: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Manage Tag
        uses: infinity-public/action-manage-tag@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag-commit: ${{ github.sha }}
          tag-min-count: 10
          tag-min-days: 30
```

## 输入参数

- `tag-commit`: **必需** 表示tag的来源commit

- `tag-min-count`: **可选** 表示保留tag的最小数量，默认10

- `tag-min-days`: **可选** 表示保留tag的最小天数，默认30天
