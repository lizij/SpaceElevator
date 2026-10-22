# 技术方案 · DESIGN

> 本文说明《流浪地球2》太空电梯三维复现的实现方式：双场景结构、程序化建模、渲染管线、相机与交互、移动端适配、测试与部署。

## 1. 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 构建 | Vite 8 | 开发服务器、ESM 打包、`base: './'` 静态部署 |
| 语言 | TypeScript 7 | 严格类型检查，无框架运行时 |
| 3D | Three.js 0.186 | WebGLRenderer、PBR、EffectComposer、OrbitControls |
| 后期 | Three.js addons | UnrealBloomPass + 自定义 ShaderPass + OutputPass |
| 测试 | Playwright | 无头截图、桌面交互断言、移动端布局/触摸断言 |
| 资源 | 程序化几何 + NASA 地球贴图 | 无外部 glTF/OBJ 模型 |

没有使用 React/Vue 等 UI 框架。HUD 是静态 HTML + 原生 DOM，避免把 3D 渲染循环与框架更新耦合。

## 2. 模块结构

```text
main.ts
 ├─ WebGLRenderer / PostRenderer
 ├─ BaseScene ── BaseEnvironment
 │   └─ SpaceElevatorBase (procedural model)
 ├─ OrbitalScene (Earth / station / counterweight / world group)
 ├─ Hud (DOM, presets, labels, telemetry)
 ├─ AmbientAudio (Web Audio)
 └─ requestAnimationFrame loop
```

### `main.ts`

- 启动流程：创建 renderer → 加载 4 张地球贴图 → 构建两个场景 → 绑定 HUD → 进入 `base` 模式。
- 模式切换 `setMode('base' | 'orbit')`：240 ms 黑场过渡，切换 OrbitControls 的启用状态、Bloom 参数、渲染目标场景与 HUD。
- 渲染循环：`base.update(dt)` 或 `orbital.update(dt)`，`post.render(dt)`，轨道模式下更新屏幕空间标签，约每 0.12 s 刷新一次遥测。
- 暴露 `window.__spaceElevator` 调试接口（`ready / mode / theme / camera / target / launch / setMode / setBasePreset / setOrbitPreset / startLaunch / toggleTheme`），仅供自动化测试和调试，不参与业务逻辑。

### `BaseScene`

- 透视相机 `fov 46`，`near 1`，`far 160000`，适配 3 km 基座到 26 km 缆索的深度范围。
- 三组机位：`overview` / `base` / `car`，通过 `startTween` 在 2.2 s 内对位置与目标点做 `easeInOutCubic` 插值。
- 点火升空：20 s 从 700 m 爬升到 5,200 m；相机目标跟随轿厢 +40 m，相机高度跟随 +300 m，形成“追车”镜头。
- 主题切换：替换雾、太阳方向/颜色、环境光、曝光、海面/天空 uniform、夜间点光源与灯带可见性。
- 竖屏适配：`adjustedPose` 按 `aspect < 0.82` 把全景/基座/轿厢机位向外拉远（1.95/1.5/1.6 倍），避免 3 km 基座在窄视野里被裁切。

### `OrbitalScene`

- 尺度：地球半径 `R = 1`；`GEO_ALT = 36000 / 6371`，`TOP_ALT = 90000 / 6371`。因此空间站在 `6.65R`，配重在 `15.13R`。
- 地球：自定义 `ShaderMaterial`，组合昼面、夜面、高光、云层、菲涅耳大气边缘与太阳方向；云层是独立的半透明球壳，缓慢自转。
- 空间站：双环 + 金色对接环 + 4 组太阳能板 + 对接臂 + 天线 + 舷窗/航标；环面用切向薄板而不是突出的“齿轮”方块。
- 配重：圆柱主体 + 纵向桁架 + 三道环肋 + 端盖机械 + 散热板 + 太阳能板 + 航标。
- 缆索：细圆柱 + 外层辉光圆柱，叠加混合；9 个轿厢沿缆索缓慢移动。
- 标签：`labelPoints` 是局部坐标；`getLabelScreenPositions` 投影到屏幕，并做地球遮挡检测（Raycaster）。
- 竖屏：`world` 组绕 Z 轴旋转 90°，让缆索从水平变为纵向，地球在画面下方、配重在上方；同时使用单独的 `PORTRAIT_PRESETS`。这样 390 px 宽的竖屏也能同时容纳地球、空间站和配重。

### `SpaceElevatorBase`

程序化模型的主体，按部位拆分：

| 构建函数 | 内容 |
| --- | --- |
| `createCar` | 宽扁船体、四角夹缆塔、太阳能顶、窗带、橙色对接环、侧设备舱、发动机辉光 |
| anchor hub | 锚泊钟形结构、竖向肋、环带、灯、4 组阻尼器、下部驱动舱 |
| main towers | 3 个 120° 分布的集群；每簇中央主桅 + 3 根外围柱 + 8 层环带 + 维护平台 + 冠部机械 |
| launch towers | 12 座，3 组 × 4 座；吊机、勤务平台、发射坪、泛光灯、配重与支撑索 |
| cables | 216 根 InstancedMesh 缆索，3 圈束；外层辉光 |
| base ring | 圆形平台、内圈海水、栈桥、外圈设备带、48 盏轮廓灯、6 艘补给船 |

几何统一通过 `MeshBuilder` 构建：按材质分桶，`mergeGeometries` 合并为少量 mesh，避免“每个螺栓一个 draw call”。缆索使用 `InstancedMesh`，是唯一需要 216 个实例的结构。

### `BaseEnvironment`

- 天空穹顶：`ShaderMaterial`，天顶/地平线/地面三色渐变 + 太阳辉光 + 地平线雾化。
- 海面：160 km × 160 km 平面，`ShaderMaterial` 叠加多组正弦波、菲涅耳、深浅水色、太阳高光与岸线泡沫；远处与雾色融合。
- 云层：程序化 `CanvasTexture` 的 Sprite 层，低成本地补足天空层次。
- 光照：方向光（太阳）+ 半球光 + 冷色补光；阴影使用 `PCFShadowMap`；夜间额外 6 盏点光源照亮平台与塔基。

### `PostRenderer`

- `RenderPass` → `UnrealBloomPass` → `GrainShader` → `OutputPass`。
- Bloom 默认强度约 0.52、半径 0.38、阈值 0.86；轨道模式降到约 0.24，避免地球高光过曝。
- `GrainShader` 同时做：轻微镜头色差（边缘）、暗角、动画胶片颗粒（0.012）。
- `OutputPass` 负责 ACES 色调映射后的 sRGB 输出。

### `Hud`

- DOM 结构在 `index.html`，样式在 `style.css`；Hud 只负责状态与事件。
- 机位按钮：`data-group="base" / "orbit"`，`data-preset`；切换模式时显示对应组。
- 标签避让：根据标签实测宽度和屏幕边距选择“右侧 / 左侧 / 居中上方”三种布局；轨道模式额外为右侧标尺预留 200 px，避免标签压住标尺。
- 标尺：轨道模式显示 0–90,000 km 的垂直刻度，按当前相机高度更新游标。
- 响应式：≤1080 px 收窄侧栏；≤860 px 隐藏规格表/标尺/提示，压缩控制栏；≤560 px 隐藏 kicker、压缩品牌区与控制栏按钮。

### `AmbientAudio`

- Web Audio 程序化合成：3 个低频正弦（41.2 / 61.8 / 97.5 Hz）构成结构嗡鸣，叠加带通滤波的白噪声作为海风。
- 必须由用户点击声音按钮触发（浏览器自动播放策略）；淡入 2.4 s。

## 3. 渲染与性能

### 几何预算

- 基座模型按材质合并后只有十余个 draw call；216 根缆索是 1 个 InstancedMesh。
- 发射塔、栏杆、灯具等大量重复小件被合并在少量 `BufferGeometry` 中。
- 没有使用外部模型/贴图集；地球 4 张纹理合计约 3 MB（2048 昼/夜/高光 + 1024 云）。

### 像素比

`pixelRatio()` 在移动端限制 devicePixelRatio，避免 3× 屏幕上 390×844 的 canvas 变成 1170×2532 的填充率灾难；桌面最多 2×。

### 后期

Bloom 是主要开销。轨道模式降低 Bloom 强度；HUD 用 CSS 而非 canvas 绘制，标签/标尺不会增加 GPU 负担。

### 测试环境的现实

无头 Playwright 使用 SwiftShader（CPU 光栅化），帧率远低于真实 GPU。`BaseScene`/`OrbitalScene` 的 `dt` 被 clamp 到 0.05，导致补间动画在测试环境里按“真实时间”变慢。因此：

- 截图脚本在启动 3.2 s 后调用 `setBasePreset(..., true)` / `setOrbitPreset(..., true)` 的 **immediate** 版本，避免等待补间。
- 交互测试对升空只断言“高度开始增加”，不把 20 s 动画压缩成 2 s。
- 移动端测试用 `page.evaluate` 的 immediate 预设来获得稳定构图，同时用 CDP `Input.dispatchTouchEvent` 验证单指/双指手势。

## 4. 交互模型

### 相机

- `OrbitControls`：`enableDamping = true`，`dampingFactor = 0.055`，`rotateSpeed = 0.6`，`zoomSpeed = 0.9`，`panSpeed = 0.75`。
- 基座相机 `minDistance`/`maxDistance` 与轨道相机分别设置，避免缩放到模型内部或飞出场景。
- 自动环绕：`autoRotate = true`，速度约 0.22；在补间/升空期间自动暂停。

### 预设补间

```text
startTween(pose, duration)
  fromPos / fromTarget  ← 当前相机
  toPos / toTarget      ← 目标机位
  update(dt): elapsed += dt; k = easeInOutCubic(elapsed / duration)
              camera.position.lerpVectors(...); controls.target.lerpVectors(...)
```

### 升空

- 状态机：`idle → climbing → topped`；再次点击 `topped` 时回收。
- 轿厢位置由 `launchTime / 20` 驱动，使用 `easeInOutCubic`；相机在相机补间结束后才进入跟随，避免两套插值互相覆盖。
- 发动机辉光与点光源在 `climbing` 时开启；HUD 显示高度、速度与进度条。

### 主题

`THEMES` 统一定义：太阳方向/颜色/强度、补光、半球光、雾色/密度、天空三色、海面三色、泡沫、曝光。切换时同时更新：

- `scene.fog`
- 太阳/补光/半球光
- 天空/海面 uniform
- `renderer.toneMappingExposure`
- 夜间点光源与灯带
- HUD 标签（晨昏 / 深夜）

## 5. 移动端适配

1. **布局**：390×844、430×932 等竖屏下隐藏规格表/标尺/提示，控制栏居中，按钮使用 `white-space: nowrap`，避免中文被拆成两行。
2. **基地机位**：`aspect < 0.82` 时按机位拉远相机，保证 3 km 基座完整入镜。
3. **轨道场景**：竖屏时 `world.rotation.z = π/2`，缆索变为纵向；地球在下、空间站在中、配重在上，形成与标尺一致的阅读顺序。
4. **标签**：根据实测宽度选择左右/居中上方布局，并夹紧 y 坐标，避免被品牌区或控制栏遮挡。
5. **触摸**：OrbitControls 原生支持单指旋转、双指捏合缩放、双指平移；测试用 CDP 触摸事件验证。

## 6. 测试

### 静态检查

```bash
npx tsc --noEmit
npm run build
```

### Playwright

| 脚本 | 覆盖 |
| --- | --- |
| `scripts/capture.mjs` | 10 张桌面截图：全景/基座/轿厢/夜景/升空/轨道四机位 |
| `scripts/test-interactions.mjs` | 拖动旋转、滚轮缩放、机位补间、昼夜、升空、轨道模式/UI/标签/标尺、回到基地、控制台错误 |
| `scripts/test-mobile.mjs` | 390×844 无横向溢出、控制栏/品牌区在视口内、单指旋转、双指捏合、机位 tap、昼夜、轨道模式、标签不出界、控制台错误 |

所有脚本通过 `APP_URL` 环境变量指定被测地址；默认 `http://127.0.0.1:4199/`。

### 断言原则

- 不依赖截图像素比对（不同 GPU/抗锯齿会产生差异）。
- 断言相机/目标点、模式、主题、升空状态、DOM 可见性与布局矩形。
- 控制台 `error` / `pageerror` 视为失败。

## 7. 部署

- `vite.config.ts` 设置 `base: './'`，所有资源使用相对路径；`dist/` 可放在任意子目录。
- 地球贴图通过 `new URL('./assets/textures/...', import.meta.url).href` 进入 Vite 资源图，构建后自动带 hash。
- 静态托管只需要 `dist/`，不需要 Node 运行时、数据库或环境变量。
- 部署前执行一次 `npm run build` 与 `node scripts/test-interactions.mjs`，确保产物可交互。

## 8. 已知限制与后续方向

- **基地缆索是 26 km 局部段**，不是 90,000 km 的完整几何；完整比例在轨道场景。
- **发射塔/平台设备为风格化重建**，细节密度低于电影资产；受实时性能和程序化建模成本限制。
- **无全局光照/SSAO**：阴影使用 PCF，暗部依靠环境光与补光；增加 SSAO 会显著提高移动端成本。
- **无头测试帧率低**：截图与补间断言使用 immediate 预设；真实浏览器动画按 60 fps。
- **可继续优化**：主塔近景的 greeble 密度、海平线与天空的过渡、地球夜面城市灯光的可见度、轨道标签在极端窗口比例下的排布。
