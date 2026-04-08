// ── テーマシステム ──

const ALTAR_TYPE_COLORS = {
  '自動': [160, 120, 48],
  '召喚': [160, 120, 48],
  '解放': [90, 138, 128],
  '封印': [106, 90, 138],
  '滅亡': [122, 48, 48],
  '覚醒': [90, 122, 90],
  '自己紹介': [180, 140, 200]
};

const THEMES = {
  tasogare: {
    name: '黄昏',
    css: {
      '--fg-base': '#E8DFC8', '--fg-dim': '#A09070',
      '--gold': '#A07830', '--gold-bright': '#C8A050',
      '--gold-r': '160', '--gold-g': '120', '--gold-b': '48',
      '--gold-bright-r': '200', '--gold-bright-g': '160', '--gold-bright-b': '80',
      '--teal': '#5A8A80', '--teal-dim': '#2A4A45',
      '--teal-r': '90', '--teal-g': '138', '--teal-b': '128',
      '--fg-base-r': '232', '--fg-base-g': '223', '--fg-base-b': '200',
      '--bg-base': '#0E0C09', '--bg-panel': '#13110D', '--bg-input': '#0A0907',
      '--border': '#2A2418', '--border-gold': 'rgba(160,120,48,0.4)',
      '--bg-overlay': '#080604', '--bg-window': 'rgba(19,17,13,0.95)',
      '--bg-window-heavy': 'rgba(19,17,13,0.97)',
      '--overlay-dim': 'rgba(0,0,0,0.7)', '--overlay-dim-heavy': 'rgba(0,0,0,0.85)',
    },
    js: {
      typeConfig: {
        自動: { color: '#C8A050', altarRgb: [160,120,48] },
        召喚: { color: '#A07830', altarRgb: [160,120,48] },
        解放: { color: '#5A8A80', altarRgb: [90,138,128] },
        封印: { color: '#6A5A8A', altarRgb: [106,90,138] },
        滅亡: { color: '#7A3030', altarRgb: [122,48,48] },
        覚醒: { color: '#5A7A5A', altarRgb: [90,122,90] },
        自己紹介: { color: '#B48CC8', altarRgb: [180,140,200] },
      },
      imageTypeColors: {
        自動: '#C8A050', 召喚: '#C8A050', 解放: '#5ABAB4', 封印: '#9B7EC8',
        滅亡: '#C84B4B', 覚醒: '#7AB87A', 自己紹介: '#B48CC8',
      },
      countdownTypeColors: {
        自動: '#C8A050', 召喚: '#C8A050', 解放: '#7AB8B0', 封印: '#8A7AA0',
        滅亡: '#A05050', 覚醒: '#7A9A7A', 自己紹介: '#B48CC8',
      },
      historyTypeBg: {
        自動: 'rgba(160,120,48,0.05)', 召喚: 'rgba(160,120,48,0.05)',
        解放: 'rgba(90,138,128,0.05)', 封印: 'rgba(106,90,138,0.05)',
        滅亡: 'rgba(122,48,48,0.05)', 覚醒: 'rgba(90,122,90,0.05)',
        自己紹介: 'rgba(180,140,200,0.05)',
      },
    }
  },
  kurenai: {
    name: '紅蓮',
    css: {
      '--fg-base': '#F0D8C8', '--fg-dim': '#B08070',
      '--gold': '#AA3A20', '--gold-bright': '#CC5A30',
      '--gold-r': '170', '--gold-g': '58', '--gold-b': '32',
      '--gold-bright-r': '204', '--gold-bright-g': '90', '--gold-bright-b': '48',
      '--teal': '#8A3A20', '--teal-dim': '#4A1A10',
      '--teal-r': '138', '--teal-g': '58', '--teal-b': '32',
      '--fg-base-r': '240', '--fg-base-g': '216', '--fg-base-b': '200',
      '--bg-base': '#0E0804', '--bg-panel': '#130A06', '--bg-input': '#0A0604',
      '--border': '#2A1408', '--border-gold': 'rgba(170,58,32,0.4)',
      '--bg-overlay': '#0A0402', '--bg-window': 'rgba(19,10,6,0.95)',
      '--bg-window-heavy': 'rgba(19,10,6,0.97)',
      '--overlay-dim': 'rgba(0,0,0,0.7)', '--overlay-dim-heavy': 'rgba(0,0,0,0.85)',
    },
    js: {
      typeConfig: {
        自動: { color: '#CC5A30', altarRgb: [170, 58, 32] },
        召喚: { color: '#CC5A30', altarRgb: [170, 58, 32] },
        解放: { color: '#E07A20', altarRgb: [200, 100, 30] },
        封印: { color: '#AA4A60', altarRgb: [160, 70, 80] },
        滅亡: { color: '#CC2A2A', altarRgb: [180, 30, 30] },
        覚醒: { color: '#E0A030', altarRgb: [200, 140, 40] },
        自己紹介: { color: '#C86A50', altarRgb: [180, 100, 70] },
      },
      imageTypeColors: {
        自動: '#CC5A30', 召喚: '#CC5A30', 解放: '#E07A20',
        封印: '#AA4A60', 滅亡: '#CC2A2A', 覚醒: '#E0A030', 自己紹介: '#C86A50',
      },
      countdownTypeColors: {
        自動: '#CC5A30', 召喚: '#CC5A30', 解放: '#E07A20',
        封印: '#AA4A60', 滅亡: '#CC2A2A', 覚醒: '#E0A030', 自己紹介: '#C86A50',
      },
      historyTypeBg: {
        自動: 'rgba(170,58,32,0.05)', 召喚: 'rgba(170,58,32,0.05)',
        解放: 'rgba(200,100,30,0.05)', 封印: 'rgba(160,70,80,0.05)',
        滅亡: 'rgba(180,30,30,0.05)', 覚醒: 'rgba(200,140,40,0.05)',
        自己紹介: 'rgba(180,100,70,0.05)',
      },
    }
  },
  shin_en: {
    name: '深淵',
    css: {
      '--fg-base': '#D8C8F0', '--fg-dim': '#8A78AA',
      '--gold': '#7A3AAA', '--gold-bright': '#9A5ACC',
      '--gold-r': '122', '--gold-g': '58', '--gold-b': '170',
      '--gold-bright-r': '154', '--gold-bright-g': '90', '--gold-bright-b': '204',
      '--teal': '#5A2A8A', '--teal-dim': '#2A1040',
      '--teal-r': '90', '--teal-g': '42', '--teal-b': '138',
      '--fg-base-r': '216', '--fg-base-g': '200', '--fg-base-b': '240',
      '--bg-base': '#08040E', '--bg-panel': '#0C0814', '--bg-input': '#060410',
      '--border': '#1A0A2A', '--border-gold': 'rgba(122,58,170,0.4)',
      '--bg-overlay': '#04020A', '--bg-window': 'rgba(12,8,20,0.95)',
      '--bg-window-heavy': 'rgba(12,8,20,0.97)',
      '--overlay-dim': 'rgba(0,0,0,0.7)', '--overlay-dim-heavy': 'rgba(0,0,0,0.85)',
    },
    js: {
      typeConfig: {
        自動: { color: '#9A5ACC', altarRgb: [122, 58, 170] },
        召喚: { color: '#9A5ACC', altarRgb: [122, 58, 170] },
        解放: { color: '#6A8ACC', altarRgb: [90, 120, 180] },
        封印: { color: '#AA6ACC', altarRgb: [150, 90, 180] },
        滅亡: { color: '#8A2A6A', altarRgb: [130, 40, 100] },
        覚醒: { color: '#AA80FF', altarRgb: [160, 120, 240] },
        自己紹介: { color: '#9A70CC', altarRgb: [140, 100, 190] },
      },
      imageTypeColors: {
        自動: '#9A5ACC', 召喚: '#9A5ACC', 解放: '#6A8ACC',
        封印: '#AA6ACC', 滅亡: '#8A2A6A', 覚醒: '#AA80FF', 自己紹介: '#9A70CC',
      },
      countdownTypeColors: {
        自動: '#9A5ACC', 召喚: '#9A5ACC', 解放: '#6A8ACC',
        封印: '#AA6ACC', 滅亡: '#8A2A6A', 覚醒: '#AA80FF', 自己紹介: '#9A70CC',
      },
      historyTypeBg: {
        自動: 'rgba(122,58,170,0.05)', 召喚: 'rgba(122,58,170,0.05)',
        解放: 'rgba(90,120,180,0.05)', 封印: 'rgba(150,90,180,0.05)',
        滅亡: 'rgba(130,40,100,0.05)', 覚醒: 'rgba(160,120,240,0.05)',
        自己紹介: 'rgba(140,100,190,0.05)',
      },
    }
  },
  souen: {
    name: '蒼炎',
    css: {
      '--fg-base': '#D4E8F0', '--fg-dim': '#7AAABB',
      '--gold': '#4A8AAA', '--gold-bright': '#6AB0CC',
      '--gold-r': '74', '--gold-g': '138', '--gold-b': '170',
      '--gold-bright-r': '106', '--gold-bright-g': '176', '--gold-bright-b': '204',
      '--teal': '#2A6A8A', '--teal-dim': '#1A3A4A',
      '--teal-r': '42', '--teal-g': '106', '--teal-b': '138',
      '--fg-base-r': '212', '--fg-base-g': '232', '--fg-base-b': '240',
      '--bg-base': '#060C12', '--bg-panel': '#0A1218', '--bg-input': '#060A0E',
      '--border': '#1A2A38', '--border-gold': 'rgba(74,138,170,0.4)',
      '--bg-overlay': '#040810', '--bg-window': 'rgba(10,18,24,0.95)',
      '--bg-window-heavy': 'rgba(10,18,24,0.97)',
      '--overlay-dim': 'rgba(0,0,0,0.7)', '--overlay-dim-heavy': 'rgba(0,0,0,0.85)',
    },
    js: {
      typeConfig: {
        自動: { color: '#6AB0CC', altarRgb: [74,138,170] },
        召喚: { color: '#6AB0CC', altarRgb: [74,138,170] },
        解放: { color: '#4ACCD0', altarRgb: [74,204,208] },
        封印: { color: '#7A9CC8', altarRgb: [122,156,200] },
        滅亡: { color: '#AA4A6A', altarRgb: [170,74,106] },
        覚醒: { color: '#4AAABB', altarRgb: [74,170,187] },
        自己紹介: { color: '#8A9CC8', altarRgb: [138,156,200] },
      },
      imageTypeColors: {
        自動: '#6AB0CC', 召喚: '#6AB0CC', 解放: '#4ACCD0', 封印: '#7A9CC8',
        滅亡: '#AA4A6A', 覚醒: '#4AAABB', 自己紹介: '#8A9CC8',
      },
      countdownTypeColors: {
        自動: '#6AB0CC', 召喚: '#6AB0CC', 解放: '#4ACCD0', 封印: '#7A9CC8',
        滅亡: '#AA4A6A', 覚醒: '#4AAABB', 自己紹介: '#8A9CC8',
      },
      historyTypeBg: {
        自動: 'rgba(74,138,170,0.05)', 召喚: 'rgba(74,138,170,0.05)',
        解放: 'rgba(74,204,208,0.05)', 封印: 'rgba(122,156,200,0.05)',
        滅亡: 'rgba(170,74,106,0.05)', 覚醒: 'rgba(74,170,187,0.05)',
        自己紹介: 'rgba(138,156,200,0.05)',
      },
    }
  },
  seiten: {
    name: '聖典',
    css: {
      '--fg-base': '#2A1A0A', '--fg-dim': '#6A4A2A',
      '--gold': '#7A4A10', '--gold-bright': '#9A6A20',
      '--gold-r': '122', '--gold-g': '74', '--gold-b': '16',
      '--gold-bright-r': '154', '--gold-bright-g': '106', '--gold-bright-b': '32',
      '--teal': '#4A6A3A', '--teal-dim': '#C8E0B8',
      '--teal-r': '74', '--teal-g': '106', '--teal-b': '58',
      '--fg-base-r': '42', '--fg-base-g': '26', '--fg-base-b': '10',
      '--bg-base': '#F0E8D8', '--bg-panel': '#E8DCC8', '--bg-input': '#F4EEE0',
      '--border': '#C8B898', '--border-gold': 'rgba(122,74,16,0.3)',
      '--bg-overlay': '#D8C8A8', '--bg-window': 'rgba(232,220,200,0.97)',
      '--bg-window-heavy': 'rgba(224,212,188,0.99)',
      '--overlay-dim': 'rgba(180,160,120,0.7)', '--overlay-dim-heavy': 'rgba(160,140,100,0.85)',
    },
    js: {
      typeConfig: {
        自動: { color: '#9A6A20', altarRgb: [122, 74, 16] },
        召喚: { color: '#9A6A20', altarRgb: [122, 74, 16] },
        解放: { color: '#4A8A5A', altarRgb: [74, 138, 90] },
        封印: { color: '#6A4A8A', altarRgb: [100, 74, 130] },
        滅亡: { color: '#8A2A2A', altarRgb: [138, 42, 42] },
        覚醒: { color: '#8A7A20', altarRgb: [138, 122, 32] },
        自己紹介: { color: '#7A5A8A', altarRgb: [120, 90, 138] },
      },
      imageTypeColors: {
        自動: '#9A6A20', 召喚: '#9A6A20', 解放: '#4A8A5A',
        封印: '#6A4A8A', 滅亡: '#8A2A2A', 覚醒: '#8A7A20', 自己紹介: '#7A5A8A',
      },
      countdownTypeColors: {
        自動: '#9A6A20', 召喚: '#9A6A20', 解放: '#4A8A5A',
        封印: '#6A4A8A', 滅亡: '#8A2A2A', 覚醒: '#8A7A20', 自己紹介: '#7A5A8A',
      },
      historyTypeBg: {
        自動: 'rgba(122,74,16,0.08)', 召喚: 'rgba(122,74,16,0.08)',
        解放: 'rgba(74,138,90,0.08)', 封印: 'rgba(100,74,130,0.08)',
        滅亡: 'rgba(138,42,42,0.08)', 覚醒: 'rgba(138,122,32,0.08)',
        自己紹介: 'rgba(120,90,138,0.08)',
      },
    }
  }
};

let currentTheme = 'tasogare';

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  currentTheme = themeKey;

  // CSS変数を適用
  const root = document.documentElement;
  Object.entries(theme.css).forEach(([k, v]) => root.style.setProperty(k, v));

  // CHANT_TYPE_CONFIG・ALTAR_TYPE_COLORS
  Object.entries(theme.js.typeConfig).forEach(([type, cfg]) => {
    if (CHANT_TYPE_CONFIG[type]) CHANT_TYPE_CONFIG[type].color = cfg.color;
    if (ALTAR_TYPE_COLORS[type]) ALTAR_TYPE_COLORS[type] = cfg.altarRgb;
  });

  // IMAGE_TYPE_COLORS
  Object.assign(IMAGE_TYPE_COLORS, theme.js.imageTypeColors);

  // COUNTDOWN_TYPE_COLORS
  Object.assign(COUNTDOWN_TYPE_COLORS, theme.js.countdownTypeColors);

  // HISTORY_TYPE_BG
  Object.assign(HISTORY_TYPE_BG, theme.js.historyTypeBg);

  localStorage.setItem('theme', themeKey);
  updateThemeUI(themeKey);
}

function updateThemeUI(themeKey) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeKey);
  });
}
