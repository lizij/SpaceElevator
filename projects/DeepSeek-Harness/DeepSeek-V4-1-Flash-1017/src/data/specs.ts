import type { ViewId } from '../state/useSceneStore'

export type Vec3 = [number, number, number]

export type ViewMeta = {
  label: string
  en: string
  index: string
  altitude: string
  kicker: string
  blurb: string
}

export type CameraPreset = {
  position: Vec3
  target: Vec3
  min: number
  max: number
  fov: number
}

export type HotspotData = {
  id: string
  view: ViewId
  position: Vec3
  title: string
  en: string
  kicker: string
  body: string
  specs: [string, string][]
  important?: boolean
  accent?: 'amber' | 'blue' | 'red'
}

export const VIEW_ORDER: ViewId[] = [
  'orbit',
  'base',
  'cabin',
  'station',
  'counterweight',
  'interior',
]

export const TOUR_ORDER: ViewId[] = [
  'base',
  'cabin',
  'interior',
  'station',
  'counterweight',
  'orbit',
]

export const VIEW_META: Record<ViewId, ViewMeta> = {
  orbit: {
    label: '全景',
    en: 'ORBITAL VIEW',
    index: '01',
    altitude: '0 — 90,000 km',
    kicker: 'MACRO SCALE',
    blurb: '地球、同步轨道空间站与 90,000 km 末端配重。真实比例下，基座只有一个像素。',
  },
  base: {
    label: '基座',
    en: 'GROUND BASE',
    index: '02',
    altitude: '0 — 2 km',
    kicker: 'UEG GABON',
    blurb: '赤道海面，直径 3 km 的人工港池。三座主塔、十二组发射塔与 216 根缆索在此汇聚。',
  },
  cabin: {
    label: '轿厢',
    en: 'CLIMBING CABIN',
    index: '03',
    altitude: '近地 — 同步轨道',
    kicker: 'HARDWARE',
    blurb: '四角夹持、金色液压臂、可展开冰盾。它不是电梯舱，是一台贴着缆索爬升的重型机器。',
  },
  station: {
    label: '空间站',
    en: 'GEO STATION',
    index: '04',
    altitude: '36,000 km',
    kicker: 'GEOSTATIONARY',
    blurb: '套在缆索上的环形桁架，中央脊柱贯穿同步轨道，轿厢从下方船坞进入。',
  },
  counterweight: {
    label: '配重',
    en: 'COUNTERWEIGHT',
    index: '05',
    altitude: '90,000 km',
    kicker: 'TERMINUS',
    blurb: '缆索末端，与地球自转同步。工业模块、散热板与警示灯，组成这条天梯的终点。',
  },
  interior: {
    label: '内景',
    en: 'CABIN INTERIOR',
    index: '06',
    altitude: '轿厢内部',
    kicker: 'INTERIOR',
    blurb: '客机式客舱布局。3+3 座椅、控制区、货舱与吊机，冷白工业照明里保留一点暖色。',
  },
}

export const CAMERA_PRESETS: Record<ViewId, CameraPreset> = {
  orbit: {
    position: [172, 86, 196],
    target: [0, 39, 0],
    min: 24,
    max: 280,
    fov: 38,
  },
  base: {
    position: [0, 105, 420],
    target: [0, 82, 0],
    min: 80,
    max: 1000,
    fov: 45,
  },
  cabin: {
    position: [600, 85, 760],
    target: [0, -38, 0],
    min: 240,
    max: 1700,
    fov: 38,
  },
  station: {
    position: [2750, 680, 3100],
    target: [0, 40, 0],
    min: 1800,
    max: 15000,
    fov: 42,
  },
  counterweight: {
    position: [1500, 600, 1700],
    target: [0, 0, 0],
    min: 700,
    max: 6000,
    fov: 44,
  },
  interior: {
    position: [0, 25, 170],
    target: [0, 20, -170],
    min: 38,
    max: 430,
    fov: 62,
  },
}

export const HOTSPOTS: HotspotData[] = [
  // Orbit
  {
    id: 'earth',
    view: 'orbit',
    position: [0, -5.4, 0],
    title: '地球',
    en: 'EARTH',
    kicker: 'HOME',
    body: '赤道海面上的太空电梯基座，是这条 90,000 km 天梯的起点。',
    specs: [
      ['半径', '6,371 km'],
      ['基座位置', '赤道 / 加蓬近海'],
    ],
    important: true,
    accent: 'blue',
  },
  {
    id: 'geo-station',
    view: 'orbit',
    position: [0, 36, 0],
    title: '同步轨道空间站',
    en: 'GEO STATION',
    kicker: '36,000 KM',
    body: '空间站与缆索同心纵向连接，是人员、物资与建造材料的换乘节点。',
    specs: [
      ['轨道', '地球同步轨道'],
      ['高度', '约 36,000 km'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'counterweight-orbit',
    view: 'orbit',
    position: [0, 90, 0],
    title: '末端配重',
    en: 'COUNTERWEIGHT',
    kicker: '90,000 KM',
    body: '缆索末端配重与地球自转同步，维持整条缆索的张力。',
    specs: [
      ['高度', '约 90,000 km'],
      ['作用', '张拉 / 自转同步'],
    ],
    important: true,
    accent: 'blue',
  },

  // Base
  {
    id: 'main-tower',
    view: 'base',
    position: [0, 150, 45],
    title: '主塔',
    en: 'MAIN TOWER ×3',
    kicker: '2,000 M',
    body: '三座 120° 分布的主塔，是缆索的地面约束。塔身有竖向肋、电梯井、维护平台和顶部机械臂。',
    specs: [
      ['数量', '3 座'],
      ['高度', '约 2,000 m'],
      ['布置', '120° 三点'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'launch-gantry',
    view: 'base',
    position: [0, 82, 26],
    title: '发射塔',
    en: 'LAUNCH GANTRY',
    kicker: '12 GROUPS',
    body: '十二组发射塔均分三组。每组由双格构塔、硬质连杆和发射平台组成，像抛石机一样为轿厢叠加初速度。',
    specs: [
      ['数量', '12 组 / 3 组 × 4'],
      ['结构', '双格构塔 + 连杆'],
      ['点火', '四台发动机'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'central-shaft',
    view: 'base',
    position: [0, 108, 0],
    title: '中央井',
    en: 'CABLE SHAFT',
    kicker: '216 CABLES',
    body: '216 根粗细不等的碳纳米缆绳在中央井汇聚，向上穿过轿厢、空间站，最终抵达配重。',
    specs: [
      ['缆索', '216 根'],
      ['轿厢', '9 部'],
      ['材料', '碳纳米管'],
    ],
    important: true,
    accent: 'blue',
  },
  {
    id: 'harbor',
    view: 'base',
    position: [118, 10, 0],
    title: '海上港池',
    en: 'SEA PLATFORM',
    kicker: '3 KM',
    body: '直径 3 km 的圆形人工港池。外圈是防波堤、栈桥、码头与保障区，水下有阻尼器和驱动平台。',
    specs: [
      ['直径', '约 3 km'],
      ['高度', '约 2 km'],
      ['位置', '赤道海面'],
    ],
    accent: 'blue',
  },
  {
    id: 'cabin-pad',
    view: 'base',
    position: [0, 20, 60],
    title: '轿厢',
    en: 'CABIN',
    kicker: '9 UNITS',
    body: '九部轿厢在发射平台与缆索之间循环。单部运力约为现役最大运载火箭的四倍。',
    specs: [
      ['数量', '9 部'],
      ['运力', '约 4× 最大火箭'],
      ['特征', '冰盾 / 四角夹持'],
    ],
    important: true,
    accent: 'amber',
  },

  // Cabin
  {
    id: 'clamp',
    view: 'cabin',
    position: [238, 60, 152],
    title: '四角夹持',
    en: 'CABLE CLAMP',
    kicker: '4 GROUPS',
    body: '四角各有一组夹持/导向塔。金色液压臂推动黑色滚轮夹块，抱住分组的缆索束。',
    specs: [
      ['夹持点', '4 角'],
      ['缆索', '216 根分四组'],
      ['材质', '钛合金 / 黄铜液压'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'ice-shield',
    view: 'cabin',
    position: [0, -126, 0],
    title: '冰盾',
    en: 'ICE SHIELD',
    kicker: 'RE-ENTRY',
    body: '返回大气层时，底部喷水并在低温中迅速结冰，形成可烧蚀/升华的冰盾，带走气动加热。',
    specs: [
      ['形态', '多瓣可展开'],
      ['作用', '防热 / 烧蚀'],
      ['材料', '冰'],
    ],
    important: true,
    accent: 'blue',
  },
  {
    id: 'roof-panel',
    view: 'cabin',
    position: [0, 96, 0],
    title: '顶部面板',
    en: 'TOP DECK',
    kicker: 'DOCKING',
    body: '深色分缝面板下面是设备与结构。顶部有吸盘连接处、空间站对接接口和引擎固定卡扣。',
    specs: [
      ['接口', '吸盘 / 对接'],
      ['功能', '顶部设备 / 结构'],
      ['颜色', '深灰复合'],
    ],
    accent: 'amber',
  },
  {
    id: 'thruster',
    view: 'cabin',
    position: [0, -90, 70],
    title: '推进器',
    en: 'THRUSTERS',
    kicker: 'LAUNCH',
    body: '发射初段由四台发动机提供推力，与发射塔的硬质连杆共同把轿厢推离平台。',
    specs: [
      ['数量', '4 台'],
      ['用途', '初段助推'],
      ['尾焰', '白 / 橙'],
    ],
    accent: 'red',
  },

  // Station
  {
    id: 'station-ring',
    view: 'station',
    position: [0, 40, 1360],
    title: '环形桁架',
    en: 'RING TRUSS',
    kicker: 'GEO',
    body: '巨大的环形桁架套在缆索上，辐射状辐条连接外围模块、太阳能板和散热板。',
    specs: [
      ['直径', '约 2.5 km（推定）'],
      ['结构', '主环 + 辐条'],
      ['轨道', 'GEO'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'station-dock',
    view: 'station',
    position: [0, -620, 0],
    title: '对接船坞',
    en: 'DOCKING CRADLE',
    kicker: 'CABIN IN',
    body: '轿厢从下方进入捕获框架，吸盘与对接接口锁定后，人员与货物进入空间站。',
    specs: [
      ['方向', '下方进入'],
      ['接口', '吸盘 / 卡扣'],
      ['作用', '换乘 / 装卸'],
    ],
    important: true,
    accent: 'blue',
  },
  {
    id: 'station-spine',
    view: 'station',
    position: [0, 520, 0],
    title: '中央脊柱',
    en: 'CENTRAL SPINE',
    kicker: 'THROUGH',
    body: '中央脊柱贯穿缆索，是空间站的纵向主结构。缆索从中间穿过，上下继续延伸。',
    specs: [
      ['方向', '纵向'],
      ['缆索', '贯穿'],
      ['功能', '主承力结构'],
    ],
    accent: 'blue',
  },

  // Counterweight
  {
    id: 'cw-top',
    view: 'counterweight',
    position: [0, 486, 0],
    title: '配重平台',
    en: 'TOP PLATFORM',
    kicker: 'TERMINUS',
    body: '90,000 km 末端的平坦平台与设备舱，是缆索的终点，也是整条天梯的张力锚。',
    specs: [
      ['高度', '约 90,000 km'],
      ['作用', '张拉 / 同步'],
      ['接口', '顶部平台'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'cw-panel',
    view: 'counterweight',
    position: [320, 130, 0],
    title: '散热 / 太阳能板',
    en: 'RADIATOR ARRAY',
    kicker: 'POWER',
    body: '配重外围的散热板与太阳能板，为末端设备提供电力并把废热辐射出去。',
    specs: [
      ['类型', '散热 / 光伏'],
      ['位置', '放射状外围'],
      ['环境', '真空 / 强日照'],
    ],
    accent: 'blue',
  },

  // Interior
  {
    id: 'cabin-interior',
    view: 'interior',
    position: [0, 34, 0],
    title: '客舱',
    en: 'PASSENGER CABIN',
    kicker: '3+3',
    body: '客机式 3+3 座椅布局，窄过道、顶部行李舱和冷白灯带。舷窗外是地球与星空。',
    specs: [
      ['布局', '3+3'],
      ['座椅', '抗荷服固定'],
      ['照明', '冷白工业灯'],
    ],
    important: true,
    accent: 'amber',
  },
  {
    id: 'cabin-console',
    view: 'interior',
    position: [0, 26, -188],
    title: '控制区',
    en: 'FLIGHT DECK',
    kicker: 'CONTROL',
    body: '控制区位于客舱前端，状态屏、操作台与通讯设备监控轿厢爬升和对接。',
    specs: [
      ['位置', '客舱前端'],
      ['设备', '状态屏 / 操作台'],
      ['通讯', 'UEG 链路'],
    ],
    important: true,
    accent: 'blue',
  },
  {
    id: 'cabin-cargo',
    view: 'interior',
    position: [0, 32, 205],
    title: '货舱',
    en: 'CARGO BAY',
    kicker: 'FREIGHT',
    body: '货舱位于客舱后段，顶部吊机与集装通道可以搬运空间站建造材料。',
    specs: [
      ['位置', '客舱后段'],
      ['设备', '吊机 / 集装架'],
      ['用途', '物资 / 建材'],
    ],
    accent: 'amber',
  },
]

export const HOTSPOT_BY_ID = Object.fromEntries(HOTSPOTS.map((h) => [h.id, h])) as Record<
  string,
  HotspotData
>
