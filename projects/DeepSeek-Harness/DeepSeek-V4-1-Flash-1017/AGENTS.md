# AGENTS.md

本文件面向后续接手本仓库的开发者与 AI Agent，说明项目目标、产品设计、开发约定和部署流程。

## 1. 项目是什么

《流浪地球2》太空电梯的交互式 Web 3D 同人重建。

- 实验环境：DeepSeek Harness + DeepSeek V4.1 Flash 1017（同一 prompt 的 Agent 横评实验之一）
- 性质：非官方同人作品，仅用于学习与展示。
- 部署：本项目已并入实验合集，由合集根目录统一构建，支持本地预览与 GitHub Pages 公开发布。

目标不是做 1:1 电影数字孪生，而是做“**在浏览器里可自由观看、可读、尽可能接近电影轮廓与机械特征**”的交互场景。

## 2. 产品设计

### 2.1 六个视图

| 视图 | 内容 | 尺度 |
|---|---|---|
| 全景 | 地球、90,000 km 缆索、GEO 空间站、末端配重 | 1 unit = 1,000 km |
| 基座 | 3 km 海上港池、三主塔、12 组发射塔、9 部轿厢 | 1 unit = 10 m |
| 轿厢 | 四角夹持、金色液压臂、冰盾、推进器、顶部对接环 | 1 unit = 0.1 m |
| 空间站 | 环形桁架、中央脊柱、船坞、太阳能板 | 1 unit = 1 m |
| 配重 | 90,000 km 末端模块、外骨骼、散热/太阳能板 | 1 unit = 1 m |
| 内景 | 2+2 客舱、控制区、货舱、舷窗 | 1 unit = 0.1 m |

### 2.2 两种模式

- **电影模式（默认）**：海雾、低饱和、暖光、Bloom、暗角、细颗粒，优先氛围。
- **工程模式**：关雾、提高环境光、显示网格与部件热点，优先阅读结构。

### 2.3 交互原则

- 单指/左键拖动旋转，双指/滚轮缩放，右键/双指平移。
- 每层内部自由缩放；跨层使用底部/左侧导航、热点或双击进入。
- 跨层用黑场过渡，不做 1:1 连续缩放。
- 移动端竖屏优先：6 项底部导航、底部抽屉信息卡、DPR 上限 1.4。
- 所有交互按钮需有可读中文标签；不要依赖 hover 才能完成关键操作。
- 基座视图提供 12 秒发射演示：点火 → 爬升 → 入轨，带 HUD、进度和取消。演示期间相机由 LaunchSequence 接管，结束后恢复 CameraControls。

### 2.4 视觉原则

1. 先剪影，后细节：三主塔、环梁、发射塔、圆形港池、四角轿厢、环形空间站必须一眼可读。
2. 真实比例 + 可读性夸张：基座在轨道层用发光标记；空间站/配重可适度放大。
3. 缆索永远用屏幕空间线宽/线束 shader，不要用真实直径。
4. 电影感来自低机位、长焦压缩、雾、蒸汽、实用光和运动，而不是无节制堆模型。
5. 近景材质要有面板缝、铆钉、液压、警示条、编号；远景靠轮廓和灯光。

## 3. 技术栈

- Vite 5 + TypeScript + React 18
- Three.js 0.169 + React Three Fiber 8
- `@react-three/drei`：CameraControls、Html、Line、Stars、RoundedBox
- `@react-three/postprocessing`：Bloom、Vignette、Noise
- Zustand：视图、模式、热点、转场、自动巡游
- 无后端、无数据库；静态站点

## 4. 目录结构

```text
src/
├── App.tsx                     # Canvas、HUD、转场、自动巡游、快捷键
├── scene/
│   ├── Experience.tsx          # 渲染器、环境贴图、纹理预加载、雾
│   ├── CameraRig.tsx           # 层级机位、竖屏适配、相机限制
│   ├── SceneContent.tsx        # 视图路由
│   ├── Effects.tsx             # Bloom / Vignette / Noise
│   ├── kit/                    # 梁、桁架、缆索、材质、程序纹理
│   ├── layers/                 # 轨道、基座、配重
│   └── parts/                  # 地球、空间站、轿厢、内景、基座部件
├── ui/                         # HUD、Intro、Loading、InfoPanel
├── state/useSceneStore.ts      # 场景状态与转场
├── data/specs.ts               # 视图、机位、热点、设定文案
└── styles.css                  # HUD / 移动端 / 转场样式
```

## 5. 开发流程

### 5.1 环境

需要 Node.js 22+ 与 npm。

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # tsc --noEmit && vite build
npm run preview      # 预览 dist
```

合集根目录提供统一编排：`npm run install:all` / `npm run build` / `npm run serve`，一次构建并汇总全部实验项目。

### 5.2 常用 URL 参数

```text
?intro=0                 跳过开场
?view=base               直达视图：orbit | base | cabin | station | counterweight | interior
?mode=engineering        直达工程模式
```

示例：

```text
http://127.0.0.1:5173/?intro=0&view=base&mode=engineering
```

### 5.3 代码约定

- TypeScript `strict`；不要用 `any` 逃避类型问题，除非是第三方 ref。
- 新几何优先用程序化 kit；重复部件用 `InstancedMesh`/`Instances`。
- 共享材质放在 `src/scene/kit/materials.ts`；不要在 render 内重复 new 材质。
- 程序纹理放 `src/scene/kit/textures.ts` 或 `panelTexture.ts`；必须缓存。
- 新增视图：在 `ViewId`、`VIEW_META`、`CAMERA_PRESETS`、`SceneContent` 同步添加。
- 新增热点：在 `HOTSPOTS` 添加，位置必须与对应层局部坐标一致。
- 新增移动端样式：在 `styles.css` 的 `@media (max-width: 860px)` 内处理。
- 不要提交 `node_modules/`、`dist/`。
- 不要提交任何 token、Cookie、私钥、个人邮箱或本地绝对路径。
- 官方参考图在 `docs/reference/`，采集自公开网页，仅用于研究对照；它们不进入网页产物（`public/` 或 `dist/`），但随实验合集仓库公开，供复盘与研究。

### 5.4 性能预算

| 视图 | 目标三角面 | 目标 draw calls |
|---|---|---|
| 轨道 | < 120k | < 40 |
| 基座 | < 600k | < 180 |
| 轿厢 | < 800k | < 140 |
| 空间站 | < 500k | < 120 |
| 内景 | < 300k | < 120 |

- 桌面 60 fps，移动端 30 fps 为目标。
- 移动端 DPR 上限 1.4；工程模式关闭 Bloom/Noise。
- 新增大批重复部件时必须实例化，并检查 `renderer.info.render`。

## 6. 部署流程（合集统一部署）

本项目不再单独部署。合集根目录提供唯一的构建与部署链路：

```text
npm run install:all   # 为全部子项目安装依赖
npm run build         # 逐子项目 vite build，汇总到根 dist/projects/<Agent>/<Model>/
npm run serve         # 本地预览整个合集
```

GitHub Pages：合集根目录的 `.github/workflows/deploy.yml` 一次性构建并发布首页与全部子项目。

### 6.1 构建路径

`vite.config.ts` 使用 `base: './'`，汇总到合集子目录后资源仍使用相对路径，可部署在任意子路径下。`src/scene/kit/textures.ts` 里的 `asset()` 同样基于相对路径。

### 6.2 本地验证生产构建

```bash
npm run build
npm run preview
```

不要用 `npm run dev` 的结果替代生产验证；Pages 使用的是构建产物。

## 7. 内容与版权

- 官方美术设定原图位于 `docs/reference/`，采集自公开网页，版权归电影版权方所有；在本非商业同人研究仓库中随档案公开，仅供学习与视觉参考。
- 网页产物只使用程序化几何、NASA/Three.js 示例纹理和本项目原创截图，不打包任何官方图版。
- README、docs 与站点里保留“非官方同人作品”声明。

## 8. 验收清单

每次提交前至少检查：

- [ ] `npm run build` 通过
- [ ] 桌面 1440×900 截图正常
- [ ] 手机 390×844 截图正常（可用 DevTools device emulation）
- [ ] 六个视图都能进入，无控制台错误
- [ ] 热点能打开/关闭信息卡
- [ ] 电影/工程模式切换正常
- [ ] 自动巡游能从基座开始切换
- [ ] 没有新增官方原图到 `public/` 或 `dist/`
- [ ] 没有提交 token、私钥、个人敏感信息

## 9. 当前限制与迭代方向

- 当前是程序化高保真近似，不是 1:1 电影资产；已加入程序化面板与法线贴图、greeble、环梁步道、缆索锚点、塔顶吊机、空间站中央舱段/天线/穿梭机等细节，但近景仍与官方高模有差距。
- 优先级最高的后续工作：
  1. 用 Blender 制作主塔、轿厢、空间站 hero 资产，导出 GLB；
  2. 把 12 秒发射演示扩展为完整时间轴（连杆对接 → 点火 → 尾焰 → 爬升 → 对接）；
  3. 加环境音、无线电、镜头震动；
  4. 加轿厢内景第一人称走动与交互；
  5. 用 KTX2/Draco 压缩 hero 资产，保持移动端 30 fps。
