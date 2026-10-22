# 第 2 轮：机械结构、夹持舱与轨道站

日期：2026-10-21。依据：[第 1 轮剩余项](round-01.md)、design-31、design-37/38、design-43。状态：造型对照、高分屏和完整交互回归完成。

| 编号 | 修改前的问题 | 本轮修复 | 再对照后的具体差异 |
| --- | --- | --- | --- |
| C05 | 外壳接近实心盒，检修面层次较浅，金色导向翼偏宽且条纹太多 | 壳体外侧后退，独立厚角框与凹面盖板；导向翼改灰色金属与三道筋 | 外框与凹面可辨，灰翼更接近图版。侧面油管和风扇外罩仍是近似布置 |
| I01 | 四块矩形平板，中央为整块平板 | 中央八边环/辐射杆、上下层安装圈、下层设备架；四片梯形翼、交叉筋、液压杆、铰轴与散热模块 | 机械空隙出现，矩形平板问题消除。展开图显示翼片仍向下聚拢，与图版向两侧张开的姿态不同；需要继续校正铰接朝向/间距和设备覆盖率 |
| S01 | 相同小盒整齐铺圈，环外轮廓薄 | 交替粗管、压力舱、维修通道、下挂设备；改变径向长度和舱高，增加环梁厚度 | 设备类型和层次已有区别，但参考中机械密度及接头更高，若干大盒仍偏简单 |
| S02 | 等径圆柱/圆环反复堆叠，底端像喷嘴 | 不同口径/长度服务舱、露出式连接框、渐细维护段和底端十字设备节点 | 下部收窄与服务节点成立。上部环架仍偏规则，底端设备头体积需继续与图版复核 |
| S03 | 塔柱护板像重复楼梯条 | 减少短盖板，改成长护板与局部检修面 | 大块面改善，但新顶板高出塔冠，需在下一轮结构复核中裁到冠下；保留此问题，不判定本项完成 |

对照图：[轿厢](../references/private/iterations/round-02/climber-comparison.jpg)、[冰盾](../references/private/iterations/round-02/ice-shield-comparison.jpg)、[轨道站](../references/private/iterations/round-02/station-comparison.jpg)。原图：[展开冰盾](../previews/iterations/round-02/ice-shield.png)、[轨道站](../previews/iterations/round-02/station.png)。

验证：

- 构建通过，固定 10 视角无 GPU / JavaScript 错误：[采集记录](../previews/iterations/round-02/capture.json)。
- 高分屏渲染 18 项通过，19 帧无 WebGL 错误；原取样框和阈值保持：[报告](../previews/iterations/round-02/rendering-verification.json)。
- 首次并行交互在 38 项后停于舱内跟随检查。脚本原先固定等待 700 ms，三组软件渲染竞争时未必产生下一帧。保留[首次记录](../previews/iterations/round-02/interaction-first-attempt.json)，改为最长 15 秒等待实际航程增长，仍按原 `1e-6` 局部相机误差断言。
- 第二次通过跟随检查，停于手机单步触摸检查：[记录](../previews/iterations/round-02/interaction-second-attempt.json)。触摸路径改成 7 段、等待实际视线变化，位移和原 `>0.1` 方向变化阈值未变。第三次独立运行 **65 项全部通过，无 JavaScript / GPU 错误**：[最终交互报告](../previews/iterations/round-02/interaction-verification.json)。没有因测试失败修改应用相机或放宽断言。

下一轮处理 N01–N03 内舱，随后结构/材质复核时继续修正本轮残余：冰盾展开姿态、轨道站护板越界、径向设备接头和密度。没有达到停止条件。
