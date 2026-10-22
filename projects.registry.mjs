/**
 * 太空电梯实验合集 —— 项目注册表（唯一扩展入口）
 *
 * 未来新增一个「agent + model」实验，只需：
 *   1. 把工程放到 projects/<Agent-Slug>/<Model-Slug>/
 *   2. 在本文件 PROJECTS 数组末尾追加一条元数据
 *   3. 运行 npm run build && npm run thumbs
 *
 * 字段说明：
 *   id            短 id（用于脚本内部标识、缩略图文件名）
 *   agent / model 首页徽章展示名（原始大小写）
 *   dir           相对 projects/ 的两级目录：[agentDir, modelDir]
 *   type          'vite'：npm install + npm run build；'static'：预构建静态包，只做拷贝+patch
 *   date          实验日期（YYYY-MM-DD，展示用）
 *   rounds        迭代轮次描述（展示用）
 *   stack         技术栈简述（展示用）
 *   highlights    首页卡片亮点（2-4 条）
 *   thumbShot     自动缩略图脚本使用的机位提示（扩展自定义时参考）
 *   entry         构建产物入口（相对项目根），默认 index.html
 *   extraEntries  需要一并注入返回按钮的其它 html（如结构 blockout 原型）
 */

export const PROJECTS = [
  {
    id: 'dsh',
    agent: 'DeepSeek Harness',
    model: 'DeepSeek V4.1 Flash 1017',
    dir: ['DeepSeek-Harness', 'DeepSeek-V4-1-Flash-1017'],
    type: 'vite',
    date: '2026-10-19',
    rounds: '12 轮自我迭代 + 最终评估',
    stack: 'React 18 · React Three Fiber 8 · Three.js 0.169 · Zustand · Vite 5',
    highlights: ['六层视图（全景/基座/轿厢/空间站/配重/内景）', '12 秒发射演示与电影/工程双模式', '216 根缆索、九部轿厢与可步入舱内景'],
    thumbShot: '基座全景默认机位',
    thumbQuery: '?intro=0&view=base',
    extraEntries: ['blockout.html'],
    readmeShots: [
      { file: 'overview', url: '?intro=0&view=orbit', wait: 9000 },
      { file: 'base', url: '?intro=0&view=base', wait: 9000 },
      { file: 'cabin', url: '?intro=0&view=cabin', wait: 9000 },
      { file: 'station', url: '?intro=0&view=station', wait: 9000 },
      { file: 'interior', url: '?intro=0&view=interior', wait: 9000 },
    ],
  },
  {
    id: 'opencode-ark-ds41',
    agent: 'OpenCode',
    model: 'DeepSeek V4.1 Flash 1017',
    dir: ['OpenCode', 'DeepSeek-V4-1-Flash-1017'],
    type: 'vite',
    date: '2026-10-20',
    rounds: '单轮交付 + Playwright 交互/移动端测试',
    stack: 'TypeScript · Three.js 0.186 · Vite 8（无框架）',
    highlights: ['基地 / 轨道双尺度场景', '点火升空追车镜头与晨昏/深夜切换', '程序化环境音、移动端竖屏标尺构图'],
    thumbShot: '基地全景默认机位',
    readmeShots: [
      { file: 'overview', wait: 9000 },
      { file: 'base', click: '[data-preset="base"]', wait: 6000 },
      { file: 'car', click: '[data-preset="car"]', wait: 6000 },
      { file: 'orbit', actions: [['click', '[data-action="orbit"]', 3500], ['click', '[data-preset="station"]', 6000]] },
      { file: 'night', actions: [['click', '[data-action="theme"]', 1500], ['click', '[data-preset="base"]', 6000]] },
    ],
  },
  {
    id: 'gpt',
    agent: 'Trae',
    model: 'GPT 6 Astra',
    dir: ['Trae', 'GPT-6-Astra'],
    type: 'vite',
    date: '2026-10-20',
    rounds: 'Revision 04 · 31 轮设定图对照迭代',
    stack: 'TypeScript · Three.js 0.180 · Vite 7（无框架）',
    highlights: ['42 座乘员舱与四个舱内观察位', 'SSAO/SMAA 自研画质管线与黑块回归验证', '按官方图版逐项像素标定的轿厢/方舟/配重'],
    thumbShot: '总览机位 / 42% 航程轿厢',
    readmeShots: [
      { file: 'overview', wait: 9000 },
      { file: 'base', click: '[data-view="base"]', wait: 7000 },
      { file: 'climber', click: '[data-view="climber"]', wait: 7000 },
      { file: 'station', click: '[data-view="station"]', wait: 7000 },
    ],
  },
  {
    id: 'evolving',
    agent: 'OpenCode',
    model: 'Seed-Evolving',
    dir: ['OpenCode', 'Seed-Evolving'],
    type: 'vite',
    date: '2026-10-19',
    rounds: '单轮交付',
    stack: 'TypeScript · Three.js 0.170 · Vite 5（无框架）',
    highlights: ['黄昏 god rays 体积光束与电影调色', '门式发射塔与三轿厢同时运行', '发射冲击波/蒸汽全屏演出、全局暂停'],
    thumbShot: '黄昏基地默认机位',
    readmeShots: [
      { file: 'overview', wait: 9000 },
      { file: 'base', clickText: '.hotspot', 'text': '海上基地', wait: 7000 },
      { file: 'station', clickText: '.hotspot', 'text': '方舟空间站', wait: 8000 },
      { file: 'follow', click: '#btn-follow', wait: 9000 },
    ],
  },
  {
    id: 'op55',
    agent: 'Claude',
    model: 'Opus 5.5',
    dir: ['Claude', 'Opus-5-5'],
    type: 'static',
    date: '2026-10-21',
    rounds: 'AI 应用平台生成产物的离线归档',
    stack: 'React · Three.js（预构建包，零安装零构建）',
    highlights: ['8 个预设视角 · 地月尺度全景', '轿厢倍速 / 画质切换 / 结构标注', '15 张 PBR 程序化贴图'],
    thumbShot: '基座全景默认机位',
    readmeShots: [
      { file: 'overview', wait: 9000 },
      { file: 'base', clickText: 'button', text: '主塔近景', wait: 7000 },
      { file: 'cabin', clickText: 'button', text: '跟随轿厢', wait: 8000 },
      { file: 'station', clickText: 'button', text: '同步轨道空间站', wait: 8000 },
      { file: 'earth-moon', clickText: 'button', text: '地月尺度全景', wait: 9000 },
    ],
  },
];

/** 项目源目录（projects/<agent>/<model>） */
export function projectPath(p) {
  return ['projects', ...p.dir].join('/');
}

/** 站点内访问路径（相对站点根，以 / 结尾） */
export function sitePath(p) {
  return ['projects', ...p.dir, ''].join('/');
}
