# 参考资料说明

## 这批资料是什么

这里收集的是《流浪地球2》官方在 2023 年 2 月**公开发布**的“太空电梯”美术设定图与相关剧照，不是付费美术设定集的扫描件，也没有下载任何盗版 PDF。

> **版权说明**：以下官方原图已随仓库保存，仅用于研究与视觉参考；版权归 **© 2019–2023 郭帆（北京）影业有限公司 / G!FILM STUDIO BEIJING CO., LTD.** 所有。请勿用于商业用途或再次分发。最终上线的 3D 站点不包含这些原图。

- 新华网 2023-02-04：《流浪地球2》的太空电梯如何搭建？美术设定集曝光
  <https://app.xinhuanet.com/news/article.html?articleId=be0206e7-a90e-421c-8a5d-b4ca81e4b42d>
- 搜狐 / 7.GAME 2023-02-05：官方新解禁！《流浪地球2》设定集要来了？！2000字+100图 超详细“太空电梯”美术设定详解
  <https://m.sohu.com/a/637464451_121119410/>
- 网易 / CG世界 2023-02-06：《流浪地球2》“太空电梯”超详细美术设定（用于交叉核对）
  <https://m.163.com/dy/article/HSTDCB0P0516BJGJ.html>

下载日期：2026-10-19。

## 版权与使用边界

图片版权归 **© 2019–2023 郭帆（北京）影业有限公司 / G!FILM STUDIO BEIJING CO., LTD.** 所有，页面中亦标注“版权所有，侵权必究”。

- 仅用于本项目内部的设定研究、建模参考和视觉比对。
- **不要**把原图、原图裁切或官方 Logo 直接放进最终上线的网站。
- 最终 3D 模型应是原创的同人近似重建，不复制官方模型、贴图或品牌标识。
- 若项目用于商业用途，需要另行取得授权。
- 如果之后拿到官方设定集 PDF 或 4K 原图，建议放在 `docs/reference/incoming/`，不要提交到公开仓库。

## 目录

```text
docs/reference/
├── curated/                 # 已重命名的关键参考图（优先看这里）
├── xinhua_01..08.png        # 新华网 8 张长图（含完整设定页）
├── sohu/                    # 搜狐文章 66 张原图（含少量微博截图/重复图）
├── crops/                   # 关键局部放大图
├── contact_1..6.jpg         # 66 张图的带编号联系表
├── key_reference_board.jpg  # 12 张核心参考图速览
├── scale_comparison.png     # 真实比例示意：地球 / 缆绳 / 基座（另有同名 SVG 源文件）
├── base_plan_schematic.png  # 基座推定平面布局（另有同名 SVG 源文件）
├── sohu_manifest.csv        # 图片尺寸清单
├── sohu_urls.txt            # 原始图片地址
└── *_article.html           # 文章原始 HTML，供追溯
```

## 关键参考图索引

| 文件 | 内容 | 用途 |
|---|---|---|
| `curated/overall_schematic.png` | 新华网总设定页：总体构造、剖面、基座平面 | 先看这张，建立全局比例 |
| `base_plan_schematic.png` | 按官方文字/透视图推定的基座平面 | 建模布局参考（非官方正交图） |
| `curated/base_aerial.jpg` | 基座 aerial，环形港池、三主塔、外侧堤桥 | 基座总图 |
| `curated/base_low_angle.jpg` | 海面低机位，三塔、环梁、拉索、发射中的轿厢 | 电影感主镜头参考 |
| `curated/base_sea.jpg` | 海面近景，平台、栈桥、拉索节点 | 近景结构/材质 |
| `curated/base_cutaway.jpg` | 主塔剖面、电梯井、维护平台 | 主塔内部结构 |
| `curated/base_hero.jpg` | 三塔 + 中心井 + 环形港池的完整俯视 | 建模总布局 |
| `curated/base_silhouette.jpg` | 低对比度远景，三塔与拉索剪影 | 构图/雾效 |
| `curated/base_ring.jpg` | 环形平台、轨道、登乘区、桥架 | 平台细节 |
| `curated/base_topdown.jpg` | 基座平面/道路/港池关系 | 平面布局 |
| `curated/base_with_engine.jpg` | 基座与远处加蓬行星发动机同框 | 环境背景 |
| `curated/launch_pair.jpg` | 双塔发射架与中间轿厢 | 发射塔结构 |
| `curated/launch_pad.jpg` | 发射平台、硬质连杆、格栅 | 发射平台细节 |
| `curated/launch_effect.jpg` | 四台发动机点火、蒸汽/火焰 | 发射动画参考 |
| `curated/cabin_iso.jpg` | 轿厢外观等轴测 | 轿厢主参考 |
| `curated/cabin_cables.jpg` | 轿厢与四角缆索夹持 | 缆索连接 |
| `curated/cabin_labels.jpg` | 轿厢/吸盘/逃逸滑板标注 | 部件命名 |
| `curated/cabin_dock.jpg` | 对接船坞、吸盘连接、货舱门 | 空间站对接 |
| `curated/cabin_ice_shield.png` | 冰盾展开/分层结构 | 冰盾动画 |
| `curated/cabin_sheet.png` | 新华网轿厢整页 | 交叉核对 |
| `curated/station.jpg` | GEO 空间站全景，环形桁架 + 中心脊柱 + 下方对接区 | 空间站主参考 |
| `curated/station_build.jpg` | 空间站建造期，环形结构与飞船 | 空间站尺度/扩展 |
| `curated/counterweight.jpg` | 配重三种方案 | 配重造型 |
| `curated/logo.jpg` | “SPACE ELEVATOR / JOINT RESEARCH BASE UEG GABON” 标识 | UI 文字/品牌参考（不要直接商用） |
| `curated/station_counterweight_sheet.png` | 新华网空间站/配重整页 | 交叉核对 |

## 已知限制

1. 公开图多为 690–1080 px 宽，且是透视图/气氛图，**没有正交三视图**，无法从图中量出精确尺寸。建模时以官方文字尺寸为骨架，其余按比例和剪影推定。
2. 官方没有公开 3D 模型；所有模型都需要重新制作。
3. 图片里的火光、雾、景深是电影氛围图，不等于最终资产的固有色。
4. 搜狐原图里混有微博评论截图和重复图，已用 `contact_*.jpg` 标号；`curated/` 只保留有效设定图。
5. 这套资料足以还原“轮廓、比例、关键机械特征、色彩和镜头”，但做不到逐个零件 1:1。若要更高还原度，需要官方设定集/原模型或投入更长的建模周期。
