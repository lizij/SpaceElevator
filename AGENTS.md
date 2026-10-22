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
| `node scripts/capture-readme-shots.mjs` | 按 registry 的 `readmeShots` 拍各项目 README 效果图到 `projects/<…>/docs/screenshots/`（可加 id） |
| `npm run audit` | 公开发布前审计（敏感串、私钥、内网地址、禁用文件类型、图片内嵌文本），必须 0 命中 |

子项目内部仍是普通 Vite 工程，可进入其目录用 `npm run dev/build` 单独开发，
但**最终验收以根目录 `npm run build` 的产物为准**。

## 5. 如何新增一个实验

1. 工程放入 `projects/<Agent 名>/<Model 名>/`（空格与点替换为 `-`，如
   `projects/Cursor/Claude-Sonnet-4-5/`）。预构建包用 `type: 'static'`，源码工程用 `type: 'vite'`。
2. 在 `projects.registry.mjs` 的 `PROJECTS` 末尾追加一条（字段含义见文件内注释）：
   `id / agent / model / dir / type / date / rounds / stack / highlights`，
   可选 `thumbQuery`（截图 URL 参数，如跳过开场）与 `extraEntries`（额外注入返回按钮的 html）。
3. 运行 `npm run build`；另开终端 `npm run serve`；执行 `npm run thumbs <id>` 拍卡片缩略图；
   若配置了 `readmeShots`，再执行 `node scripts/capture-readme-shots.mjs <id>` 生成 README 效果图
   （输出到该项目 `docs/screenshots/`，并在其 README 用相对路径引用）；最后再 `npm run build`。
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
- 两类截图分工：`hub/thumbs/` 是首页卡片图（随构建进入 `dist/`/gh-pages）；
  各项目 `docs/screenshots/` 是 README 效果图（随 `main` 源码存档，不进入 `dist/`；
  vite 项目天然不打包 docs，static 项目由构建器在拷贝时排除 `docs/`）。

## 7. 公开发布约束（硬性）

本仓库整体公开发布到 GitHub，所有内容必须可公开、可开源：

- 只用公开可安装的技术栈与公共 registry，不依赖非公开源、私有 SDK 或本机专属工具。
- 不含个人身份信息、鉴权凭据、机器绝对路径、内网地址/域名或其它不适合公开的内容。
- 提交/发布前必须运行 `npm run audit`（含 `--dist` 时连产物一起审），要求 0 命中。
- 第三方依赖须为 MIT/Apache/BSD/ISC/MPL/Zlib 等宽松开源许可；避免 GPL/AGPL 类强 copyleft。
- 预构建静态包若来自第三方平台，需移除其平台引导数据与品牌标识、把运行时探测静默，
  并保证在纯静态托管下功能完整、控制台无报错。

## 8. 部署到 GitHub Pages

### 8.1 发布方式（gh-pages 分支模式）

采用经典的 **`peaceiris/actions-gh-pages`** 模式（与各实验原工程的做法一致）：

- `.github/workflows/deploy.yml` 在 push 到 `main` 时，于干净的 ubuntu + Node 22 环境执行
  `npm run build`，然后用内置 `GITHUB_TOKEN` 把 `dist/` 以 **orphan 分支**方式强制推送到
  远程 **`gh-pages`** 分支（`force_orphan: true`、`enable_jekyll: false`）。
- 产物 = 站点根：`gh-pages` 分支根目录直接是首页 `index.html`、`projects/`、`thumbs/`，
  没有 Jekyll 构建环节（`.nojekyll` 由 Action 自动生成）。
- 部署 URL 为仓库项目页：`https://<user>.github.io/<repo>/`。
- 所有资源均为相对路径（`base: './'`、返回按钮用 `../../../index.html`），因此站点放在
  项目页子路径下也能正常工作；`dist/` 也可直接丢到任意静态托管。

### 8.2 新仓库首次上线（重要：必须手动做一次）

workflow 成功、`gh-pages` 分支存在，**不等于站点已启用**。全新仓库第一次使用 Pages，
GitHub 强制要求在网页设置里选一次发布源，这一步**无法**由 workflow 内置的 `GITHUB_TOKEN`
或 git SSH 推送代替（它们有推送/部署权限，但没有"创建 Pages 站点"的管理权限）：

1. 先 push `main`，确认 Actions 里的 Deploy 工作流跑绿、远程出现 `gh-pages` 分支；
2. 打开 **Settings → Pages → Build and deployment**；
3. **Source 选择 `Deploy from a branch`**（不是 "GitHub Actions"）；
4. **Branch 选 `gh-pages`，目录选 `/ (root)`，Save**。

保存后通常 30 秒~1 分钟站点生效，无需再次触发构建。此后每次 push `main` 都会自动更新，
不必再动设置。（已启用过 Pages 的老仓库无此步骤，这也是"有的仓库好像不用配置"的原因。）

> 备选模式：也可用官方 `configure-pages` + `upload-pages-artifact` + `deploy-pages`
> （artifact 模式，无 gh-pages 分支），但那时 Source 必须选 "GitHub Actions"。
> 两种模式二选一，本仓库固定使用上面的 gh-pages 分支模式。

### 8.3 排障

- **站点 404**：先看 Actions 是否成功、`gh-pages` 分支是否存在且根目录有 `index.html`；
  再确认 Settings → Pages 的 Source 是否为 `gh-pages / root`（新仓库最常见原因就是没做 8.2）。
  注意 github.io 对未部署站点返回的是 GitHub 自己的 404 页（`server: GitHub.com`），
  与我们应用内的 404 不是一回事。
- **子项目白屏 / 应用内 404**：多为前端路由不接受以 `/index.html` 结尾的路径，或资源用了
  绝对路径。合集已用相对路径、目录形式链接，并对预构建包做了 basename/路径规范化。
- **CDN 延迟**：部署成功后边缘节点最长可能有 1–2 分钟缓存延迟，强刷或稍候再试。
- **不要在 Pages 源里放参考图**：调研用美术集只随 `main` 存档，不进入 `dist/`/`gh-pages`。
- 验证线上时不要只看 HTTP 状态：用真实浏览器进每个项目确认 canvas 渲染、返回按钮可回首页。

## 9. 改动后的验收清单

- [ ] `npm run build` 通过，5（或 N）个项目都汇总进 `dist/projects/`
- [ ] `npm run audit` 0 命中；构建后再审产物可用 `node scripts/audit-sensitive.mjs --dist`
- [ ] `npm run serve` 后：首页卡片齐全、缩略图加载；逐个进入作品，渲染与交互正常
- [ ] 每个作品（及额外 html）顶部返回按钮能回到首页，含 `/<repo>/` 子路径场景
- [ ] 桌面与移动视口抽查；控制台无错误（各项目原有的无害 warning 除外）
- [ ] 新增/改动实验已在 `projects.registry.mjs` 登记，缩略图已更新
- [ ] 影响部署时：push 后 Actions 跑绿、`gh-pages` 已更新，线上各入口实测 200
