# 文档索引

## 先读

1. [电影设定研究](太空电梯-电影设定研究.md)
   - 官方设定拆解：总体参数、基座、缆索、轿厢、空间站、配重、色彩与镜头。
2. [还原方案](太空电梯-还原方案.md)
   - 分层尺度、场景规格、技术栈、镜头、资产清单、实施阶段与验收标准。

## 参考资料

- [参考资料说明与版权边界](reference/README.md)
- [核心参考图速览](reference/key_reference_board.jpg)
- [关键参考图](reference/curated/)
- [66 张图的联系表](reference/contact_1.jpg)
- [真实比例示意](reference/scale_comparison.png)
- [基座推定布局](reference/base_plan_schematic.png)
- [运行截图](screenshots/base.png)

## 结论摘要

- 采用 **Vite + TypeScript + React Three Fiber + drei + postprocessing**。
- 不做 1:1 连续缩放，做 **L0 轨道 / L1 基座 / L2 轿厢 / L3 空间站 / L4 内景** 分层尺度。
- 首版用程序化几何 + 模块化 kit，后续可替换 Blender hero 资产。
- 默认“电影模式”，保留“工程模式”用于看细节。
- 预计 2 周左右做出高保真可展示版。
