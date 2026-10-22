# 太空电梯实验合集 · Space Elevator Agent Lab

> 同一句话 Prompt，不同 **Agent × Model** —— 《流浪地球2》太空电梯 Web 3D 还原能力横评。

每个实验都由同一句提示词驱动 Agent 自主完成：研究官方美术集、编写代码、迭代还原、本地部署。
原始 Prompt 见 [PROMPT.md](PROMPT.md)。

## 实验一览

| Agent | Model | 路径 |
| --- | --- | --- |
| DeepSeek Harness | DeepSeek V4.1 Flash 1017 | [`projects/DeepSeek-Harness/DeepSeek-V4-1-Flash-1017/`](projects/DeepSeek-Harness/DeepSeek-V4-1-Flash-1017/) |
| OpenCode | DeepSeek V4.1 Flash 1017 | [`projects/OpenCode/DeepSeek-V4-1-Flash-1017/`](projects/OpenCode/DeepSeek-V4-1-Flash-1017/) |
| Trae | GPT 6 Astra | [`projects/Trae/GPT-6-Astra/`](projects/Trae/GPT-6-Astra/) |
| OpenCode | Seed-Evolving | [`projects/OpenCode/Seed-Evolving/`](projects/OpenCode/Seed-Evolving/) |
| Claude | Opus 5.5 | [`projects/Claude/Opus-5-5/`](projects/Claude/Opus-5-5/)（预构建静态归档） |

从合集首页可以进入任一作品观看实现效果；每个作品页面顶部居中都有一个「合集首页」返回圆点
（鼠标悬停/键盘聚焦展开文字），点击即回到首页。

## 工程结构

```text
.
├── projects.registry.mjs   # ★ 项目注册表：首页卡片与构建编排的唯一数据源
├── projects/<Agent>/<Model>/   # 各实验工程（vite 源码工程或 static 预构建归档）
├── hub/                    # 合集首页源码（零框架 HTML/CSS/JS）+ thumbs/ 缩略图
├── scripts/                # 构建编排、返回按钮注入、缩略图、本地服务器、公开审计
├── .github/workflows/      # GitHub Pages 部署
├── PROMPT.md               # 所有实验共用的原始一句话 Prompt
└── dist/                   # 构建产物（gitignore），可整体静态托管
```

各子项目是相互独立的工程，保留各自的 three.js/Vite 大版本与 README、调研文档、迭代记录；
合集只负责统一安装、构建、汇总和导航，不修改它们的渲染逻辑（迁移期的脱敏与相对路径改造除外）。

## 快速开始

要求 Node.js 22+。

```bash
npm install            # 安装合集编排脚本依赖（playwright-core，仅截图用）
npm run install:all    # 为全部子项目安装依赖（首次需要）
npm run build          # 构建全部项目并汇总到 dist/
npm run thumbs         # （可选）统一重拍首页缩略图，需要先 npm run serve
npm run serve          # 本地预览整个合集 → http://127.0.0.1:4177/
npm run audit          # 敏感信息扫描（projects/ 与 dist/）
```

`npm run build` 会：为每个 Vite 子项目执行 `npm install`（按需，显式使用公共 npm registry）
与 `npm run build`，静态归档直接拷贝；全部产物按 `projects/<Agent>/<Model>/` 两级目录汇总到
根 `dist/`，注入返回按钮并生成首页。一条命令产出可整体托管的纯静态站点。

### 单独开发某个子项目

每个 `projects/<Agent>/<Model>/` 仍是标准 Vite 工程，可独立开发：

```bash
cd projects/DeepSeek-Harness/DeepSeek-V4-1-Flash-1017
npm install
npm run dev       # 本地开发
npm run build     # 仅构建该项目
```

> 注意：子项目单独构建的产物不含合集返回按钮与首页；最终验收请始终在根目录 `npm run build`。
> 安装依赖时如需绕过本机全局 npm 源，可加 `--registry=https://registry.npmjs.org/`。

## 部署到 GitHub Pages

仓库已含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：push 到 `main`
即自动执行 `npm run build` 并把 `dist/` 发布到 GitHub Pages。首次使用需要在仓库
**Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

所有资源均使用相对路径（`base: './'`），站点部署在仓库项目页子路径
（`https://<user>.github.io/<repo>/`）下也能正常访问。也可把 `dist/` 托管到任意静态托管。

## 加入新的 Agent × Model 实验（三步）

1. 把实验工程放到 `projects/<Agent 名>/<Model 名>/`（空格与点用 `-` 代替，如
   `projects/Cursor/Claude-Sonnet-4-5/`）。
2. 在 [`projects.registry.mjs`](projects.registry.mjs) 的 `PROJECTS` 数组末尾追加一条：

   ```js
   {
     id: 'cursor-sonnet',                 // 短 id
     agent: 'Cursor',
     model: 'Claude Sonnet 4.5',
     dir: ['Cursor', 'Claude-Sonnet-4-5'], // 与目录一致
     type: 'vite',                        // 'vite'（自动 install+build）或 'static'（预构建包直接拷贝）
     date: '2026-10-23',
     rounds: '单轮交付',
     stack: 'TypeScript · Three.js · Vite',
     highlights: ['亮点一', '亮点二'],
     thumbQuery: '',                      // 可选：截图时附加的 URL 查询参数，如跳过开场 ?intro=0
     extraEntries: [],                    // 可选：需要一并注入返回按钮的其它 html
   }
   ```

3. 依次运行：

   ```bash
   npm run build      # 自动构建并汇总，首页出现新卡片
   npm run serve      # 另开终端
   npm run thumbs     # 为新作品（可加 id 参数）统一重拍缩略图
   npm run build      # 让缩略图进入 dist/
   ```

### 接入要求（公开开源约束）

- 技术栈与依赖必须公开可安装：仅使用公共 npm registry（根 `.npmrc` 已固定
  `https://registry.npmjs.org/`），不依赖任何非公开源或无法公开获取的 SDK。
- 不包含个人身份信息、鉴权凭据、机器相关的绝对路径或其它不适合公开的内容；
  提交前运行 `npm run audit`，必须 0 命中。
- Vite 项目保持 `base: './'`；预构建静态包需保证资源相对路径加载、外部运行时探测已静默。
- 美术集/设定图等调研资料可放入项目 `docs/`（采集自公开网页、仅作非商业同人研究），
  但不要把参考图打进网页产物。

## 版权

全部作品均为《流浪地球2》太空电梯的非商业同人重建，与电影出品方无隶属或授权关系；
片名、美术设定及相关权利归各自权利人所有。3D 模型由代码程序化生成，地球影像来自
NASA Blue Marble 等公有领域来源，第三方库均为 MIT 等开源许可（详见各项目说明）。
合集仅供技术学习与 Agent 能力横评。
