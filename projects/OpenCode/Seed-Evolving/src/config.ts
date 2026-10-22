/**
 * 场景全局尺寸常量（艺术化压缩比例）。
 * 依据《流浪地球2》官方美术设定：
 * 电梯约 9 万公里、方舟站 3.6 万公里同步轨道、基座直径 3km、三主塔 + 圆盘平台。
 */
export const EARTH_RADIUS = 1200

export const PLATFORM_RADIUS = 138 // 圆盘基座外半径
export const GANTRY_RADIUS = 42 // 门式发射塔六柱环绕半径
export const TOWER_RADIUS = GANTRY_RADIUS
export const TOWER_HEIGHT = 430 // 门式发射塔立柱高度
export const TOWER_APEX = TOWER_HEIGHT // 兼容旧引用：缆绳束起点高度
export const GANTRY_LEVELS = [150, 275, 400] // 横向箱梁门洞高度
export const GANTRY_HEIGHT = 40 // 地面发射工位门架高度

/* ---- 统一的半径分层（杜绝轿厢升降/交会穿模）----
   轿厢角动力舱本地半径约 17（已含 0.72 缩放）。 */
export const CABIN_POD_R = 17 // 轿厢外伸包络（自抱缆点到角舱）
export const RAIL_R = 26 // 轿厢主导轨半径（3 部相隔 120°，同高度间距 45 > 2×17）
/** 轿厢升降安全走廊外半径：导轨 + 角舱 + 间隙 */
export const CABIN_CLEAR_R = RAIL_R + CABIN_POD_R + 4 // = 47
/** 轿厢走廊内半径（中央缆绳束必须在此之内） */
export const CABIN_INNER_R = RAIL_R - CABIN_POD_R - 3 // = 6
/** 中央发射竖井 / 平台井孔半径（轿厢从中穿越） */
export const SHAFT_RADIUS = CABIN_CLEAR_R - 2 // =45
export const STATION_HEIGHT = 1000 // 方舟空间站相对海面高度
export const COUNTERWEIGHT_HEIGHT = 1330 // 末端配重高度
export const OCEAN_RADIUS = 760 // 局部海面半径（覆盖长桥与人工岛）
export const BRIDGE_LENGTH = 430 // 入海长桥长度
export const ISLAND_RADIUS = 78 // 人工岛尺度

/** 默认 / 复位相机参数（侧仰拍：海面→圆盘→三塔→缆绳→方舟站→配重） */
export const HOME = {
  position: [1850, EARTH_RADIUS + 540, 800] as [number, number, number],
  target: [0, EARTH_RADIUS + 560, 0] as [number, number, number]
}

/** 缩放范围（OrbitControls） */
export const CAMERA_LIMITS = {
  minDistance: 20,
  maxDistance: 7600,
  minPolar: 0.06,
  maxPolar: Math.PI / 2 + 0.12
}

/** 轿厢单程上升时长（秒） */
export const CABIN_TRIP_SECONDS = 32
