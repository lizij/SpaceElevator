# AGENTS.md

本文件面向后续接手本仓库的开发者与 AI Agent，说明工程目标、结构、命令、约定与验收方式。

## 1. 这是什么

「同一句话 Prompt × 不同 Agent + Model」的实验合集：每个子项目都是用**同一句提示词**
（见 [PROMPT.md](PROMPT.md)）让不同 Agent 工具与模型，独立完成的《流浪地球2》太空电梯
Web 3D 还原。合集提供一个总首页，可进入任一作品并返回；全部作品均为非商业同人项目。

目标读者体验：打开首页 → 点卡片进入对应 3D 作品 → 用鼠标/触屏旋转缩放观看 → 一键返回首页。

## 2. 顶层结构与数据流

```text
projects.registry.mjs   唯一数据源：每个实验一条元数据（首页卡片 + 构建编排共用）
projects/<Agent>/<Model>/
                        各实验工程，两种类型：
                        - vite   ：标准 Vite 工程，自动 npm install + npm run build
                        - static ：预构建静态包，直接拷贝（无安装/构建）
hub/                    首页源码（原生 HTML/CSS/JS，无框架）；thumbs/ 存放卡片缩略图
scripts/                编排脚本（见第 4 节）
dist/                   唯一部署产物（gitignore），可整体静态托管
```

构建数据流：`registry + 各子项目 dist → 根 dist/projects/<Agent>/<Model>/ → 注入返回按钮 → 生成首页`。

## 3. 环境

- Node.js **22+**，npm。
- 公共 npm registry（根 `.npmrc` 已固定 `https://registry.npmjs.org/`）；
  编排脚本安装子项目依赖时也显式传 `--registry`，因此不依赖任何本机/私有源配置。
- 仅缩略图脚本用到 `playwright-core`（根 devDependency）与本机一个 Chromium/Chrome；
  它不是运行时依赖，CI 部署不需要截图。

## 4. 命令（在仓库根目录执行）

| 命令 | 作用 |
| --- | --- |
| `npm run install:all` | 为全部 vite 子项目安装依赖 |
| `npm run build` | 安装（按需）→ 构建 → 汇总 `dist/` → 注入返回按钮 → 生成首页 |
| `npm run serve` | 零依赖静态服务器预览整个合集（默认 http://127.0.0.1:4177/） |
| `npm run thumbs` | 用 Playwright 统一重拍卡片缩略图（需先 `npm run serve`），可加 id 参数只拍某个 |
| `npm run audit` | 公开发布前审计（敏感串、私钥、内网地址、禁用文件类型、图片内嵌文本），必须 0 命中 |

子项目内部仍是普通 Vite 工程，可进入其目录用 `npm run dev/build` 单独开发，
但**最终验收以根目录 `npm run build` 的产物为准**。

## 5. 如何新增一个实验

1. 工程放入 `projects/<Agent 名>/<Model 名>/`（空格与点替换为 `-`，如
   `projects/Cursor/Claude-Sonnet-4-5/`）。预构建包用 `type: 'static'`，源码工程用 `type: 'vite'`。
2. 在 `projects.registry.mjs` 的 `PROJECTS` 末尾追加一条（字段含义见文件内注释）：
   `id / agent / model / dir / type / date / rounds / stack / highlights`，
   可选 `thumbQuery`（截图 URL 参数，如跳过开场）与 `extraEntries`（额外注入返回按钮的 html）。
3. 运行 `npm run build`；另开终端 `npm run serve`；执行 `npm run thumbs <id>` 拍缩略图；
   再 `npm run build` 让缩略图进入 `dist/`。
4. 浏览器从首页进入新作品，确认渲染正常、返回按钮可用、控制台无错误。

## 6. 工程约定

- **统一相对路径**：vite 项目必须 `base: './'`，使产物可放在任意子路径（含 GitHub Pages
  项目页）。static 包资源引用必须是相对路径，且不得在运行时依赖任何外部后端。
- **返回按钮由构建期注入**（`scripts/inject-chrome.mjs`），不要在子项目源码里手写；
  它是纯 CSS（无内联脚本），以兼容各项目严格的 Content-Security-Policy；位置固定在页面顶部居中。
- **不升级子项目依赖大版本**：不同实验使用各自的 three.js / Vite 版本，版本差异封闭在子目录内，
  避免画面回归。
- **首页零框架**：改卡片展示只动 `hub/` 与 `projects.registry.mjs`，不要引入前端框架或构建步骤。
- 测试截图、帧序列、`node_modules/`、`dist/`、`.runtime/` 等生成物不入库；调研用的公开美术集、
  设定图、文档、迭代记录保留在各子项目 `docs/`/`references/` 中，但参考图不打进网页产物。

## 7. 公开发布约束（硬性）

本仓库整体公开发布到 GitHub，所有内容必须可公开、可开源：

- 只用公开可安装的技术栈与公共 registry，不依赖非公开源、私有 SDK 或本机专属工具。
- 不含个人身份信息、鉴权凭据、机器绝对路径、内网地址/域名或其它不适合公开的内容。
- 提交/发布前必须运行 `npm run audit`（含 `--dist` 时连产物一起审），要求 0 命中。
- 第三方依赖须为 MIT/Apache/BSD/ISC/MPL/Zlib 等宽松开源许可；避免 GPL/AGPL 类强 copyleft。
- 预构建静态包若来自第三方平台，需移除其平台引导数据与品牌标识、把运行时探测静默，
  并保证在纯静态托管下功能完整、控制台无报错。

## 8. 部署

- `.github/workflows/deploy.yml`：push 到 `main` 即在干净环境执行 `npm run build`
  并把 `dist/` 发布到 GitHub Pages（一次性部署首页与全部作品）。首次启用需在仓库
  **Settings → Pages → Source** 选择 **GitHub Actions**。
- 所有资源相对路径，站点可部署在仓库项目页子路径；`dist/` 也可直接放到任意静态托管。

## 9. 改动后的验收清单

- [ ] `npm run build` 通过，5（或 N）个项目都汇总进 `dist/projects/`
- [ ] `npm run audit` 0 命中；构建后再审产物可用 `node scripts/audit-sensitive.mjs --dist`
- [ ] `npm run serve` 后：首页卡片齐全、缩略图加载；逐个进入作品，渲染与交互正常
- [ ] 每个作品（及额外 html）顶部返回按钮能回到首页，含 `/<repo>/` 子路径场景
- [ ] 桌面与移动视口抽查；控制台无错误（各项目原有的无害 warning 除外）
- [ ] 新增/改动实验已在 `projects.registry.mjs` 登记，缩略图已更新
