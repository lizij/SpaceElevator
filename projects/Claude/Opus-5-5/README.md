# 流浪地球2 · 太空电梯 3D（预构建归档）

「同一 Prompt × 不同 Agent+Model」实验合集成员之一。

- **实验环境**：Claude + Opus 5.5
- **形态**：由 AI 应用平台生成的纯前端 React + Three.js 应用的**预构建产物归档**（无源码、无构建步骤），并入合集后由合集统一静态托管。
- **脱敏说明**：迁移时已移除原平台的引导脚本、用户/租户标识与「AI 生成」角标，bundle 中平台运行时 SDK 的域名与标识被替换为无效占位（相关代码在独立页面中为永不触发的死代码），不依赖任何平台后端或 mock 接口即可完整运行。

## 运行

本项目无需安装依赖、无需构建。在合集根目录执行：

```bash
npm run build     # 静态包会被直接汇总进根 dist/
npm run serve     # 从合集首页进入本项目
```

> 必须经 HTTP 服务器访问，不能直接双击 index.html（页面使用 ES Module，file:// 下会被浏览器拦截）。

## 操作

- 拖动旋转 · 滚轮/双指缩放 · 右键或双指拖动平移
- 底部 8 个预设视角（基座全景 → 地月尺度全景）
- 暂停轿厢 / 自动环绕 / 标注开关、轿厢倍速、高/流畅画质切换

## 目录说明

```text
index.html              入口（相对路径加载资源）
client/assets/
  index-*.js            应用主包（React + Three.js）
  toolkit-*.js radix-*.js   依赖 chunk（已脱敏）
  rolldown-runtime-*.js 运行时
  polyfills.js          旧浏览器 polyfill
  index-*.css           样式
  *.jpg ×15             PBR 贴图（地球昼夜/云层、金属、船体、甲板、舱体等）
  avatar.svg            应用图标（favicon）
```

## 版权

同人非官方作品，3D 模型全部由代码程序化生成；地球影像来自 NASA Blue Marble。片名与美术设定权利归各自权利人所有，仅供学习研究。
