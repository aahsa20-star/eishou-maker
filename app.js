// ── Sound Engine ──
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.enabled = localStorage.getItem('se_enabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('se_volume') ?? '0.5');
  }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? this.volume : 0;
    this.masterGain.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = buf;
    this.reverbNode.connect(this.masterGain);
  }
  setVolume(v) {
    this.volume = v;
    localStorage.setItem('se_volume', String(v));
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? v : 0;
    this._updateBGMVolume();
  }
  setEnabled(b) {
    this.enabled = b;
    localStorage.setItem('se_enabled', String(b));
    if (this.masterGain) this.masterGain.gain.value = b ? this.volume : 0;
    this._updateBGMVolume();
    if (!b) this.stopBGM();
  }
  _osc(freq, type, dur, gain, env, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (opts.delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (env.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (opts.reverb && this.reverbNode) {
      const rg = this.ctx.createGain();
      rg.gain.value = opts.reverbMix || 0.3;
      g.connect(rg);
      rg.connect(this.reverbNode);
    }
    g.connect(this.masterGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  _noise(dur, gain, filterFreq, filterType = 'lowpass', opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (opts.delay || 0);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = filterFreq;
    if (opts.Q) f.Q.value = opts.Q;
    s.connect(f);
    f.connect(g);
    if (opts.reverb && this.reverbNode) {
      const rg = this.ctx.createGain();
      rg.gain.value = 0.2;
      g.connect(rg);
      rg.connect(this.reverbNode);
    }
    g.connect(this.masterGain);
    s.start(t);
    s.stop(t + dur);
  }

  // 単語受信：星が降るようなきらめき
  wordReceived() {
    this.init();
    const base = 900 + Math.random() * 300;
    this._osc(base, 'sine', 0.35, 0.12, { a: 0.005 }, { reverb: true, reverbMix: 0.4 });
    this._osc(base * 1.5, 'sine', 0.25, 0.06, { a: 0.02 }, { delay: 0.03, reverb: true });
  }
  // 単語選択：魔法陣に宝石を置く音
  wordSelected() {
    this.init();
    this._osc(440, 'sine', 0.5, 0.15, { a: 0.005 }, { reverb: true, reverbMix: 0.5 });
    this._osc(660, 'triangle', 0.35, 0.08, { a: 0.02 }, { delay: 0.02, reverb: true });
    this._osc(220, 'sine', 0.4, 0.06, { a: 0.01 });
  }
  // 単語削除：消え去る音
  wordRemoved() {
    this.init();
    this._osc(600, 'sine', 0.2, 0.08, { a: 0.005 }, { freqEnd: 250 });
  }
  // 詠唱開始：儀式の始まり
  ritualStart(type) {
    this.init();
    const bases = { '召喚': 80, '解放': 100, '封印': 60, '滅亡': 50, '覚醒': 90 };
    const base = bases[type] || 80;
    this._osc(base, 'sine', 3, 0.2, { a: 0.3 }, { freqEnd: base * 2.5, reverb: true, reverbMix: 0.5 });
    this._osc(base * 0.5, 'sine', 3.5, 0.1, { a: 0.5 }, { reverb: true });
    this._noise(2.5, 0.06, 300, 'lowpass', { attack: 0.5, reverb: true });
    this._osc(base * 12, 'sine', 2, 0.03, { a: 0.8 }, { delay: 0.5, reverb: true, reverbMix: 0.6 });
  }
  // 詠唱行出現：段階的に高まるチャイム
  lineReveal(index, total) {
    this.init();
    const progress = index / Math.max(total - 1, 1);
    const base = 500 + progress * 500;
    const gain = 0.15 + progress * 0.1;
    this._osc(base, 'sine', 0.7, gain, { a: 0.01 }, { reverb: true, reverbMix: 0.4 + progress * 0.3 });
    this._osc(base * 1.5, 'triangle', 0.4, gain * 0.4, { a: 0.03 }, { delay: 0.02, reverb: true });
    if (index > 0) {
      this._osc(base * 2, 'sine', 0.3, gain * 0.15, { a: 0.05 }, { delay: 0.05, reverb: true });
    }
  }
  // 詠唱完成：衝撃波
  chantComplete(type) {
    this.init();
    const bases = { '召喚': 70, '解放': 90, '封印': 50, '滅亡': 40, '覚醒': 80 };
    const base = bases[type] || 70;
    this._osc(base, 'sine', 2.5, 0.35, { a: 0.005 }, { reverb: true, reverbMix: 0.6 });
    this._osc(base * 0.5, 'sine', 3, 0.15, { a: 0.01 }, { reverb: true });
    this._noise(1.5, 0.12, 400, 'lowpass', { attack: 0.005, reverb: true });
    this._osc(1500, 'sine', 2, 0.04, { a: 0.1 }, { delay: 0.1, reverb: true, reverbMix: 0.7 });
    this._osc(2000, 'sine', 1.5, 0.02, { a: 0.2 }, { delay: 0.2, reverb: true });
  }
  // 詠唱消滅：溶けていく音
  chantFade() {
    this.init();
    this._osc(400, 'sine', 1.5, 0.08, { a: 0.01 }, { freqEnd: 150, reverb: true, reverbMix: 0.6 });
    this._noise(1, 0.03, 800, 'bandpass', { attack: 0.01, reverb: true });
  }
  // コピー確認音
  uiConfirm() {
    this.init();
    this._osc(800, 'sine', 0.15, 0.08, { a: 0.005 });
    this._osc(1200, 'sine', 0.15, 0.06, { a: 0.005 }, { delay: 0.08 });
  }

  // ── BGM（MP3ループ再生） ──
  startBGM() {
    if (this._bgmAudio) return;
    const audio = new Audio('/bgm/Moonlight_on_Vellum.mp3');
    audio.loop = true;
    audio.volume = this.enabled ? 0.3 * this.volume : 0;
    audio.play().catch(() => {});
    this._bgmAudio = audio;
  }
  stopBGM() {
    if (this._bgmAudio) {
      this._bgmAudio.pause();
      this._bgmAudio.currentTime = 0;
      this._bgmAudio = null;
    }
  }
  _updateBGMVolume() {
    if (this._bgmAudio) {
      this._bgmAudio.volume = this.enabled ? 0.3 * this.volume : 0;
    }
  }
}
const sfx = new SoundEngine();

let words = {};
let wordOrder = [];       // 投稿順の単語リスト（番号付与用）
let wordVotes = {};       // { word: vote数 }
let userVotes = {};       // { username: word } 1人1票追跡
let voteSortMode = false; // 人気順ソート
let participants = {};    // { username: { wordCount, voteCount, messageCount } }
let mvpUpdateTimer = null;
let chainChantEnabled = localStorage.getItem('chain_chant') === 'true';
let chainCount = 0;
let chainedWord = null; // 引き継ぎ単語
let selected = [];
let selectedType = '自動';
let speechEnabled = true;
let ws = null;
let connected = false;

const savedChannel = localStorage.getItem('twitch_channel');
if (savedChannel) document.getElementById('channel').value = savedChannel;

function toggleConnect() {
  if (connected) { disconnect(); return; }
  const ch = document.getElementById('channel').value.trim().toLowerCase();
  if (!ch) return;
  localStorage.setItem('twitch_channel', ch);
  connect(ch);
}

function connect(channel) {
  const st = document.getElementById('status');
  const btn = document.getElementById('connectBtn');
  st.textContent = '接続中...';
  st.className = 'status';

  ws = new WebSocket('wss://irc-ws.chat.twitch.tv');
  ws.onopen = () => {
    ws.send('NICK justinfan12345');
    ws.send('JOIN #' + channel);
  };
  ws.onmessage = (e) => {
    const lines = e.data.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
      if (line.includes('366')) {
        connected = true;
        st.textContent = '接続済み: #' + channel;
        st.className = 'status connected';
        btn.textContent = '切断';
        startMvpTimer();
      }
      const userMatch = line.match(/:(\w+)!/);
      const username = userMatch ? userMatch[1].toLowerCase() : null;
      // 全PRIVMSGをカウント
      if (username && line.includes('PRIVMSG')) {
        if (!participants[username]) participants[username] = { wordCount: 0, voteCount: 0, messageCount: 0 };
        participants[username].messageCount++;
      }
      const wordMatch = line.match(/PRIVMSG\s+#\S+\s+:!word\s+(.+)/i);
      if (wordMatch) {
        const w = wordMatch[1].trim().substring(0, 20);
        if (w) {
          addWord(w);
          if (username && participants[username]) participants[username].wordCount++;
        }
      }
      const voteMatch = line.match(/PRIVMSG\s+#\S+\s+:!vote\s+(\d+)\s*$/i);
      if (voteMatch) {
        if (username && participants[username]) participants[username].voteCount++;
        const num = parseInt(voteMatch[1]);
        addVote(num, username);
      }
      const odaiMatch = line.match(/PRIVMSG\s+#\S+\s+:!odai\s+(.+)/i);
      if (odaiMatch) {
        const text = odaiMatch[1].trim().slice(0, 20);
        if (text) addOdaiFromChat(text, username);
      }
      // バトルモード：!red / !blue
      if (battleMode) {
        const redMatch = line.match(/PRIVMSG\s+#\S+\s+:!red\s+(.+)/i);
        if (redMatch) {
          const w = redMatch[1].trim().substring(0, 20);
          if (w) addBattleWord('red', w, username);
        }
        const blueMatch = line.match(/PRIVMSG\s+#\S+\s+:!blue\s+(.+)/i);
        if (blueMatch) {
          const w = blueMatch[1].trim().substring(0, 20);
          if (w) addBattleWord('blue', w, username);
        }
      }
    }
  };
  ws.onclose = () => { disconnect(); };
  ws.onerror = () => { disconnect(); };
}

function disconnect() {
  if (ws) { ws.close(); ws = null; }
  connected = false;
  participants = {};
  stopMvpTimer();
  updateMvpDisplay();
  chainedWord = null;
  resetChain();
  document.getElementById('status').textContent = '未接続';
  document.getElementById('status').className = 'status';
  document.getElementById('connectBtn').textContent = '接続';
}

function addWord(w) {
  sfx.wordReceived();
  words[w] = (words[w] || 0) + 1;
  if (!wordOrder.includes(w)) {
    wordOrder.push(w);
    wordVotes[w] = 0;
  }
  renderWords();
}

function addVote(num, username) {
  if (num < 1 || num > wordOrder.length) return;
  const targetWord = wordOrder[num - 1];
  if (!targetWord || !words[targetWord]) return;
  // 前の投票を取り消し
  const prevWord = userVotes[username];
  if (prevWord === targetWord) return; // 同じ単語には再投票不可
  if (prevWord && wordVotes[prevWord] !== undefined) {
    wordVotes[prevWord] = Math.max(0, wordVotes[prevWord] - 1);
  }
  userVotes[username] = targetWord;
  wordVotes[targetWord] = (wordVotes[targetWord] || 0) + 1;
  sfx.wordReceived();
  renderWords();
  syncVoteRanking();
}

function toggleVoteSort() {
  voteSortMode = !voteSortMode;
  const btn = document.getElementById('sortToggle');
  btn.classList.toggle('active', voteSortMode);
  btn.textContent = voteSortMode ? '投稿順' : '人気順';
  renderWords();
}

function syncVoteRanking() {
  // 投票ランキングはoverlay演出中にupdateOverlayInfoDisplaysで表示される
}

// ── 連続詠唱機能 ──
function toggleChainChant() {
  chainChantEnabled = !chainChantEnabled;
  localStorage.setItem('chain_chant', chainChantEnabled);
  // 設定モーダル内のボタンを同期
  const settingsBtn = document.getElementById('settingsChainBtn');
  if (settingsBtn) {
    settingsBtn.textContent = chainChantEnabled ? 'ON' : 'OFF';
    settingsBtn.classList.toggle('active', chainChantEnabled);
  }
  if (!chainChantEnabled) {
    chainedWord = null;
    resetChain();
    renderSelected();
  }
}

function resetChain() {
  chainCount = 0;
}

function applyChainAfterGenerate() {
  if (!chainChantEnabled || selected.length === 0) return;
  const lastWord = selected[selected.length - 1];
  chainCount++;
  chainedWord = lastWord;
  // 2秒後に選択をクリアして引き継ぎ単語を設定
  setTimeout(() => {
    selected = [lastWord];
    renderSelected();
  }, 2000);
}

// 初期化
(function initChainToggle() {
  const btn = document.getElementById('chainToggle');
  if (btn) btn.classList.toggle('active', chainChantEnabled);
})();

// ── お題機能 ──
const ODAI_PRESETS = [
  '最強の必殺技', '世界を救う呪文', '禁断の魔法',
  '伝説の武器', '闇の儀式', '古代の契約',
  '最後の切り札', '運命の詠唱', '封印された力',
  '異世界の門', '魂の叫び', '終焉の予言'
];
let currentOdai = null;

function initOdaiPresets() {
  const container = document.getElementById('odaiPresets');
  container.innerHTML = ODAI_PRESETS.map((text, i) =>
    `<button class="odai-preset-btn" data-index="${i}" onclick="adoptOdai(${i})">${esc(text)}</button>`
  ).join('');
}

function adoptOdai(index) {
  currentOdai = ODAI_PRESETS[index];
  document.getElementById('odaiCurrent').textContent = currentOdai;
  // 全ボタンのスタイルリセット→採用中マーク
  document.querySelectorAll('.odai-preset-btn').forEach((btn, i) => {
    btn.classList.toggle('adopted', i === index);
    btn.textContent = i === index ? '\u2713 ' + ODAI_PRESETS[i] : ODAI_PRESETS[i];
  });
  syncOdai();
}

function adoptCustomOdai() {
  const input = document.getElementById('odaiCustomInput');
  const text = input.value.trim();
  if (!text) return;
  currentOdai = text;
  document.getElementById('odaiCurrent').textContent = currentOdai;
  document.querySelectorAll('.odai-preset-btn').forEach((btn, i) => {
    btn.classList.remove('adopted');
    btn.textContent = ODAI_PRESETS[i];
  });
  input.value = '';
  syncOdai();
}

function toggleOdaiCollapse() {
  const area = document.getElementById('odaiArea');
  area.classList.toggle('expanded');
  localStorage.setItem('odai_collapsed', area.classList.contains('expanded') ? 'false' : 'true');
}
function clearOdai() {
  currentOdai = null;
  document.getElementById('odaiCurrent').textContent = '';
  document.querySelectorAll('.odai-preset-btn').forEach((btn, i) => {
    btn.classList.remove('adopted');
    btn.textContent = ODAI_PRESETS[i];
  });
  syncOdai();
}

function syncOdai() {
  // お題はoverlay演出中にupdateOverlayInfoDisplaysで表示される
}

initOdaiPresets();
// お題折りたたみの初期状態（デフォルトは折りたたみ）
if (localStorage.getItem('odai_collapsed') === 'false') {
  document.getElementById('odaiArea').classList.add('expanded');
} else {
  document.getElementById('odaiArea').classList.remove('expanded');
}

// ── お題チャット募集 ──
let odaiChatCandidates = []; // { text, username }

function addOdaiFromChat(text, username) {
  // 重複チェック（同じテキスト）
  if (odaiChatCandidates.some(c => c.text === text)) return;
  odaiChatCandidates.push({ text, username });
  if (odaiChatCandidates.length > 20) odaiChatCandidates.shift();
  renderOdaiChatCandidates();
  sfx.wordReceived();
}

function renderOdaiChatCandidates() {
  const container = document.getElementById('odaiChatCandidates');
  container.innerHTML = odaiChatCandidates.map((c, i) =>
    `<button class="odai-chat-btn" onclick="adoptChatOdai(${i})">${esc(c.text)}<span class="odai-chat-user">@${esc(c.username)}</span></button>`
  ).join('');
}

function adoptChatOdai(index) {
  const candidate = odaiChatCandidates[index];
  if (!candidate) return;
  currentOdai = candidate.text;
  document.getElementById('odaiCurrent').textContent = currentOdai;
  // プリセットの採用中マーク解除
  document.querySelectorAll('.odai-preset-btn').forEach((btn, i) => {
    btn.classList.remove('adopted');
    btn.textContent = ODAI_PRESETS[i];
  });
  syncOdai();
}

// ── MVP機能 ──
function getMvp() {
  let best = null;
  let bestScore = 0;
  for (const [username, data] of Object.entries(participants)) {
    const score = (data.wordCount * 3) + (data.voteCount * 2) + (data.messageCount * 1);
    if (score > bestScore) {
      bestScore = score;
      best = { username, score, ...data };
    }
  }
  return best;
}

function updateMvpDisplay() {
  const mvp = getMvp();
  const infoEl = document.getElementById('mvpInfo');
  const btnEl = document.getElementById('mvpBtn');
  if (mvp) {
    infoEl.textContent = `最強の使い魔：${mvp.username}`;
    infoEl.style.display = '';
    btnEl.style.display = '';
  } else {
    infoEl.style.display = 'none';
    btnEl.style.display = 'none';
  }
}

function addMvpAsWord() {
  const mvp = getMvp();
  if (!mvp) return;
  if (words[mvp.username]) return; // 既にカードにある
  addWord(mvp.username);
}

function startMvpTimer() {
  stopMvpTimer();
  mvpUpdateTimer = setInterval(updateMvpDisplay, 10000);
}

function stopMvpTimer() {
  if (mvpUpdateTimer) { clearInterval(mvpUpdateTimer); mvpUpdateTimer = null; }
}

function renderWords() {
  const grid = document.getElementById('wordGrid');
  let entries = Object.entries(words);
  if (voteSortMode) {
    entries.sort((a, b) => (wordVotes[b[0]] || 0) - (wordVotes[a[0]] || 0));
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }
  grid.innerHTML = '';
  const hasWords = entries.length > 0;
  document.getElementById('clearWordsBtn').style.display = hasWords ? '' : 'none';
  document.getElementById('sortToggle').style.display = hasWords ? '' : 'none';
  for (const [w, count] of entries) {
    const num = wordOrder.indexOf(w) + 1;
    const votes = wordVotes[w] || 0;
    const card = document.createElement('div');
    let cls = 'word-card';
    if (count >= 3) cls += ' hot';
    if (votes >= 5) cls += ' vote-hot';
    card.className = cls;
    const voteBadge = votes > 0 ? `<span class="word-votes" style="${votes >= 3 ? 'color:var(--gold-bright);' : ''}">▲${votes}</span>` : '';
    card.innerHTML = `<span class="word-num">${num}</span><div class="word-text">${esc(w)}</div><div class="word-count">${count}回投稿</div>${voteBadge}<button class="word-delete" onclick="event.stopPropagation();deleteWord('${esc(w).replace(/'/g, "\\'")}', this)">&times;</button>`;
    card.onclick = () => selectWord(w);
    grid.appendChild(card);
  }
}

function deleteWord(w, btn) {
  sfx.wordRemoved();
  const card = btn.closest('.word-card');
  card.classList.add('removing');
  setTimeout(() => {
    delete words[w];
    delete wordVotes[w];
    // wordOrderは番号を維持するため削除しない（仕様通り）
    const idx = selected.indexOf(w);
    if (idx !== -1) { selected.splice(idx, 1); renderSelected(); }
    renderWords();
    syncVoteRanking();
  }, 150);
}

function clearAllWords() {
  sfx.wordRemoved();
  const removedWords = Object.keys(words);
  words = {};
  wordOrder = [];
  wordVotes = {};
  userVotes = {};
  participants = {};
  selected = selected.filter(w => !removedWords.includes(w));
  renderSelected();
  renderWords();
  syncVoteRanking();
  updateMvpDisplay();
}

function addManualWord() {
  const input = document.getElementById('manualWord');
  const w = input.value.trim().substring(0, 20);
  if (!w) return;
  addWord(w);
  selectWord(w);
  input.value = '';
}

function selectWord(w) {
  if (selected.includes(w)) return;
  sfx.wordSelected();
  selected.push(w);
  renderSelected();
}

function removeSelected(i) {
  sfx.wordRemoved();
  selected.splice(i, 1);
  renderSelected();
}

function clearSelected() {
  selected = [];
  chainedWord = null;
  resetChain();
  renderSelected();
  document.getElementById('resultPreview').classList.remove('visible');
}

let dragIdx = null;
function renderSelected() {
  const container = document.getElementById('selectedWords');
  if (selected.length === 0) {
    container.innerHTML = '<span class="placeholder-text">言霊よ、集え...</span>';
    return;
  }
  container.innerHTML = '';
  selected.forEach((w, i) => {
    const el = document.createElement('div');
    const isChained = (i === 0 && w === chainedWord && chainChantEnabled);
    el.className = 'selected-word' + (isChained ? ' chained' : '');
    el.draggable = true;
    el.innerHTML = `${isChained ? '<span class="chain-badge">引継</span>' : ''}<span>${esc(w)}</span><span class="remove" onclick="event.stopPropagation();removeSelected(${i})">&times;</span>`;
    el.addEventListener('dragstart', () => { dragIdx = i; el.style.opacity = '0.4'; });
    el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => { el.classList.remove('drag-over'); });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (dragIdx === null || dragIdx === i) return;
      const item = selected.splice(dragIdx, 1)[0];
      selected.splice(i, 0, item);
      renderSelected();
    });
    container.appendChild(el);
  });
}

// ── 認証 ──
let authState = { loggedIn: false, userName: null, isSubscriber: false };
function getTwitchLoginUrl() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  return 'https://id.twitch.tv/oauth2/authorize?' + new URLSearchParams({
    client_id: 'wo0r7r7n2oru29gkjewg6jz2lzohhk',
    redirect_uri: 'https://eishou-maker.vercel.app/api/auth/callback',
    response_type: 'code',
    scope: 'user:read:subscriptions',
    state: state
  });
}

function twitchLogin() {
  window.location.href = getTwitchLoginUrl();
}
async function twitchLogout() {
  await fetch('/api/auth/logout');
  authState = { loggedIn: false, userName: null, isSubscriber: false };
  updateAuthUI();
  updateRateInfo();
  updateBattleBtn();
  updateRemixBtn();
}
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/refresh');
    const data = await res.json();
    if (data.loggedIn) {
      authState = { loggedIn: true, userName: data.userName, isSubscriber: data.isSubscriber };
    }
  } catch {}
  updateAuthUI();
  updateRateInfo();
  updateBattleBtn();
  updateRemixBtn();
}
function updateAuthUI() {
  const area = document.getElementById('authArea');
  if (!authState.loggedIn) {
    area.innerHTML = '<button class="auth-login-btn" onclick="twitchLogin()">使い魔と契約する</button><div class="auth-perk-hint">契約者には詠唱20回/刻・幻視召喚5回/日の力が与えられる</div>';
  } else if (authState.isSubscriber) {
    area.innerHTML = `<span class="auth-user subscriber"><span class="star">⚔</span>${esc(authState.userName)}（契約者）</span><button class="auth-logout-btn" onclick="twitchLogout()">ログアウト</button>`;
  } else {
    area.innerHTML = `<span class="auth-user">${esc(authState.userName)} として顕現中</span><button class="auth-logout-btn" onclick="twitchLogout()">ログアウト</button>`;
  }
  updateImageGenButton();
}
function updateImageGenButton() {
  const btn = document.getElementById('chantGenImageBtn');
  if (!btn) return;
  if (authState.isSubscriber) {
    btn.textContent = 'AI画像を生成';
    btn.disabled = false;
    btn.onclick = generateChantImage;
    btn.classList.remove('locked');
  } else {
    btn.textContent = 'AI画像を生成';
    btn.disabled = false;
    btn.onclick = openAuthorModal;
    btn.classList.remove('locked');
  }
}
checkAuth();

// ── レート制限 ──
function getRateWindow() { return authState.isSubscriber ? 3600000 : 86400000; } // サブスク:1時間, 一般:24時間
function getImageRateWindow() { return 86400000; } // 画像は常に24時間ウィンドウ
function getRateMax() { return authState.isSubscriber ? 20 : 2; }
function getImageRateMax() { return 5; } // サブスク限定、常に5

function getRateLogs() {
  try { return JSON.parse(localStorage.getItem('rate_limit_log') || '[]'); } catch { return []; }
}
function getActiveRateLogs() {
  const now = Date.now();
  const w = getRateWindow();
  return getRateLogs().filter(t => now - t < w);
}
function getImageRateLogs() {
  try { return JSON.parse(localStorage.getItem('image_rate_limit_log') || '[]'); } catch { return []; }
}
function getActiveImageRateLogs() {
  const now = Date.now();
  const w = getImageRateWindow();
  return getImageRateLogs().filter(t => now - t < w);
}
function addRateLog() {
  const logs = [...getActiveRateLogs(), Date.now()];
  localStorage.setItem('rate_limit_log', JSON.stringify(logs));
  updateRateInfo();
}
function addImageRateLog() {
  const logs = [...getActiveImageRateLogs(), Date.now()];
  localStorage.setItem('image_rate_limit_log', JSON.stringify(logs));
  updateImageRateInfo();
}
function formatResetTime(minsLeft) {
  if (minsLeft >= 60) {
    const h = Math.floor(minsLeft / 60);
    const m = minsLeft % 60;
    return m > 0 ? `${h}時間${m}分後リセット` : `${h}時間後リセット`;
  }
  return `${minsLeft}分後リセット`;
}
function updateRateInfo() {
  const logs = getActiveRateLogs();
  const max = getRateMax();
  const w = getRateWindow();
  const remaining = Math.max(0, max - logs.length);
  const el = document.getElementById('rateInfo');
  const btn = document.getElementById('generateBtn');
  let text = `詠唱の刻 残り ${remaining} / ${max}`;
  if (logs.length > 0 && remaining < max) {
    const oldest = Math.min(...logs);
    const resetAt = oldest + w;
    const minsLeft = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
    text += `（${formatResetTime(minsLeft)}に解放）`;
  }
  el.textContent = text;
  el.className = 'rate-info' + (remaining <= 0 ? ' danger' : remaining <= 1 ? ' warning' : '');
  if (remaining <= 0) {
    btn.disabled = true;
    if (!authState.isSubscriber) {
      el.innerHTML = `詠唱の刻 残り 0 / ${max} ― 力が尽きた。時を待て<span style="display:block;font-size:11px;margin-top:4px;color:var(--fg-dim);">──<span onclick="openAuthorModal()" style="color:var(--gold);cursor:pointer;text-decoration:underline;margin-left:4px;">契約者は20回/時</span></span>`;
    } else {
      el.textContent = `詠唱の刻 残り 0 / ${max} ― 力が尽きた。時を待て`;
    }
  } else if (btn.textContent === '詠唱生成') {
    btn.disabled = false;
  }
}
function updateImageRateInfo() {
  const el = document.getElementById('imageRateInfo');
  if (!el) return;
  if (!authState.isSubscriber) {
    el.textContent = '';
    return;
  }
  const logs = getActiveImageRateLogs();
  const max = getImageRateMax();
  const remaining = Math.max(0, max - logs.length);
  el.textContent = `AI画像生成 残り ${remaining} / ${max}`;
  el.className = 'rate-info-image' + (remaining <= 0 ? ' danger' : remaining <= 1 ? ' warning' : '');
}
updateRateInfo();
setInterval(() => { updateRateInfo(); updateImageRateInfo(); }, 30000);

const API_URL = '/api/chant';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 詠唱オーバーレイ演出 ──
const CHANT_TYPE_CONFIG = {
  '自動': { color: '#C8A050' },
  '召喚': { color: '#A07830' },
  '解放': { color: '#5A8A80' },
  '封印': { color: '#6A5A8A' },
  '滅亡': { color: '#7A3030' },
  '覚醒': { color: '#5A7A5A' },
};

let chantOverlayActive = false;

function updateOverlayInfoDisplays() {
  // ガイド
  const guideEl = document.getElementById('ovInfoGuide');
  if (guideEnabled && chantOverlayActive) {
    guideEl.classList.add('visible');
  } else {
    guideEl.classList.remove('visible');
  }

  // お題
  const odaiEl = document.getElementById('ovInfoOdai');
  if (currentOdai && chantOverlayActive) {
    odaiEl.innerHTML = `<div class="ov-info-odai-label">お題</div><div class="ov-info-odai-text">${esc(currentOdai)}</div>`;
    odaiEl.classList.add('visible');
  } else {
    odaiEl.classList.remove('visible');
    odaiEl.innerHTML = '';
  }

  // 投票ランキング
  const voteEl = document.getElementById('ovInfoVote');
  const ranking = wordOrder
    .filter(w => words[w] && wordVotes[w] > 0)
    .map(w => ({ word: w, votes: wordVotes[w] }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3);
  if (ranking.length > 0 && chantOverlayActive) {
    const rankLabels = ['1位', '2位', '3位'];
    voteEl.innerHTML = `<div class="ov-info-vote-title">人気単語</div>` +
      ranking.map((r, i) => `<div class="ov-info-vote-item"><span class="rank">${rankLabels[i]}</span>${esc(r.word)}<span class="votes">▲${r.votes}</span></div>`).join('');
    voteEl.classList.add('visible');
  } else {
    voteEl.classList.remove('visible');
    voteEl.innerHTML = '';
  }

  // MVP
  const mvpEl = document.getElementById('ovInfoMvp');
  const mvp = getMvp();
  if (mvp && chantOverlayActive) {
    mvpEl.innerHTML = `<div class="ov-info-mvp-title">MVP</div><div class="ov-info-mvp-name">\u{1F451} ${esc(mvp.username)}</div>`;
    mvpEl.classList.add('visible');
  } else {
    mvpEl.classList.remove('visible');
    mvpEl.innerHTML = '';
  }

  // チェインカウンター
  const chainEl = document.getElementById('ovInfoChain');
  if (chainCount >= 2 && chantOverlayActive) {
    chainEl.innerHTML = `<div class="ov-info-chain-label">連続詠唱</div><div class="ov-info-chain-num">\u{1F517} \u00D7 ${chainCount}</div>`;
    chainEl.classList.add('visible');
    const numEl = chainEl.querySelector('.ov-info-chain-num');
    if (numEl) numEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
  } else {
    chainEl.classList.remove('visible');
    chainEl.innerHTML = '';
  }
}

function showChantOverlay(text, type, chantWords, evaluation, imageUrl) {
  // 前回の演出が残っていたら閉じる
  if (chantOverlayActive) closeChantOverlay();

  chantOverlayActive = true;
  const cfg = CHANT_TYPE_CONFIG[type] || CHANT_TYPE_CONFIG['召喚'];

  const bg = document.getElementById('chantOverlayBg');
  const deco = document.getElementById('chantDecoLine');
  const win = document.getElementById('chantWindow');
  const body = document.getElementById('chantBody');
  const typeEl = document.getElementById('chantWindowType');
  const divider = document.getElementById('chantDivider');
  const wordsEl = document.getElementById('chantOvWords');
  const evalEl = document.getElementById('chantOvEval');

  // Reset
  body.innerHTML = '';
  divider.classList.remove('visible');
  wordsEl.classList.remove('visible');
  evalEl.classList.remove('visible');
  evalEl.innerHTML = '';
  const imgArea = document.getElementById('chantOvImage');
  imgArea.innerHTML = '';
  imgArea.classList.remove('visible');
  const dlBtn = document.getElementById('chantDlImageBtn');
  dlBtn.style.display = 'none';
  document.getElementById('chantStampBtn').style.display = 'none';
  document.getElementById('chantStampHint').style.display = 'none';
  // 画像URL: 引数で渡された場合はセット、新規生成時はリセット
  if (imageUrl) {
    _lastGeneratedImageUrl = imageUrl;
  } else {
    _lastGeneratedImageUrl = null;
  }
  typeEl.textContent = type || '召喚';
  typeEl.style.color = cfg.color;

  // タイプラベル：一瞬大きく表示→定位置に縮小
  typeEl.animate([
    { fontSize: '48px', opacity: 0.8, offset: 0 },
    { fontSize: '16px', opacity: 1, offset: 1 }
  ], { duration: 400, easing: 'ease-in', fill: 'forwards', delay: 300 });

  const lines = text.split(/\\n|\n/).map(s => s.trim()).filter(Boolean);
  const lineEls = lines.map(line => {
    const el = document.createElement('div');
    el.className = 'chant-line';
    line.split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      span.style.transition = 'opacity 0.15s ease-in';
      el.appendChild(span);
    });
    body.appendChild(el);
    return el;
  });

  if (chantWords && chantWords.length > 0) {
    wordsEl.innerHTML = chantWords.map(w => `<span>${esc(w)}</span>`).join('');
  } else {
    wordsEl.innerHTML = '';
  }

  // Show overlay info
  updateOverlayInfoDisplays();

  // Animate in
  bg.classList.add('visible');
  deco.classList.add('visible');
  setTimeout(() => {
    win.classList.add('visible');
    win.animate([
      { clipPath: 'inset(0 0 100% 0)', opacity: 0.8 },
      { clipPath: 'inset(0 0 0% 0)', opacity: 1 }
    ], { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.1, 1)', fill: 'forwards' });
  }, 200);

  // Reveal lines
  const charDelay = 60;
  let cumulativeStart = 700;
  lineEls.forEach((el, i) => {
    const chars = el.querySelectorAll('span');
    const lineStart = cumulativeStart;
    cumulativeStart += chars.length * charDelay + 400;
    setTimeout(() => {
      el.style.opacity = '1';
      chars.forEach((ch, ci) => {
        setTimeout(() => {
          ch.style.opacity = '1';
          ch.style.textShadow = '0 0 12px rgba(var(--gold-bright-r),var(--gold-bright-g),var(--gold-bright-b),0.6)';
          setTimeout(() => { ch.style.textShadow = ''; ch.style.transition = 'text-shadow 0.5s'; }, 200);
        }, ci * charDelay);
      });
      sfx.lineReveal(i, lineEls.length);
    }, lineStart);
  });

  // 全行の表示完了時間を計算
  const totalLineTime = cumulativeStart + 800;

  // 全行表示完了後にフッター・×ボタン・アクションを表示
  setTimeout(() => {
    divider.classList.add('visible');
    wordsEl.classList.add('visible');
    if (evaluation) {
      const ec = ELEMENT_COLORS[evaluation.element] || '#888';
      const rc = RARITY_COLORS[evaluation.rarity] || '#888';
      const stars = '\u2605'.repeat(evaluation.power || 0) + '\u2606'.repeat(5 - (evaluation.power || 0));
      evalEl.innerHTML = `<span class="chant-ov-eval-element" style="background:${ec}">${esc(evaluation.element)}</span><span class="chant-ov-eval-power">${stars}</span><span class="chant-ov-eval-rarity" style="color:${rc}">${esc(evaluation.rarity)}</span>`;
      evalEl.classList.add('visible');
    }
    document.getElementById('chantOvActions').classList.add('visible');
    document.getElementById('chantCloseBtn').classList.add('visible');
    updateImageGenButton();
    updateImageRateInfo();
    sfx.chantComplete(type || '召喚');

    // 画像URLがあれば復元
    if (imageUrl) {
      showGeneratedImage(document.getElementById('chantOvImage'), imageUrl);
      document.getElementById('chantDlImageBtn').style.display = '';
      document.getElementById('chantStampBtn').style.display = '';
      document.getElementById('chantStampHint').style.display = '';
    }

    // 現在の詠唱情報を保持（コピー・画像保存用）
    _lastChantOverlay = { text, type, words: chantWords, evaluation, imageUrl: imageUrl || null, profile: null };
  }, totalLineTime);
}

let _lastChantOverlay = null;
let _lastGeneratedImageUrl = null;
let _currentChantId = null;

function closeChantOverlay() {
  const win = document.getElementById('chantWindow');
  const deco = document.getElementById('chantDecoLine');
  const bg = document.getElementById('chantOverlayBg');

  win.classList.remove('visible');
  deco.classList.remove('visible');
  bg.classList.remove('visible');
  document.getElementById('chantCloseBtn').classList.remove('visible');
  document.getElementById('chantOvActions').classList.remove('visible');
  sfx.chantFade();

  // Hide info displays
  document.getElementById('ovInfoGuide').classList.remove('visible');
  document.getElementById('ovInfoOdai').classList.remove('visible');
  document.getElementById('ovInfoVote').classList.remove('visible');
  document.getElementById('ovInfoMvp').classList.remove('visible');
  document.getElementById('ovInfoChain').classList.remove('visible');

  // サイドカラム復帰＆魔法陣を再表示
  restoreSideColumns();
  document.getElementById('altarArea').style.display = '';

  setTimeout(() => {
    document.getElementById('chantBody').innerHTML = '';
    document.getElementById('chantDivider').classList.remove('visible');
    document.getElementById('chantOvWords').classList.remove('visible');
    document.getElementById('chantOvEval').classList.remove('visible');
    const imgArea = document.getElementById('chantOvImage');
    imgArea.innerHTML = '';
    imgArea.classList.remove('visible');
    chantOverlayActive = false;
  }, 700);
}

function copyChantFromOverlay(btn) {
  if (!_lastChantOverlay) return;
  sfx.uiConfirm();
  navigator.clipboard.writeText(_lastChantOverlay.text).then(() => {
    btn.textContent = 'コピー済';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'テキストをコピー'; btn.classList.remove('copied'); }, 1500);
  });
}

function saveChantImageFromOverlay() {
  if (!_lastChantOverlay) return;
  const { text, type, words, evaluation } = _lastChantOverlay;
  saveChantImage(text, words || [], type || '召喚', evaluation || null);
}

// ── Xシェア ──
function buildShareText(text, type, evaluation) {
  const lines = text.split(/\n/).filter(s => s.trim());
  const preview = lines.length > 1 ? lines.slice(0, 2).join('\n') + '——' : lines[0] + '——';
  const isIntro = type === '自己紹介';
  let body = preview + '\n\n';
  if (isIntro) {
    body += '#詠唱メーカー #自己紹介詠唱';
  } else {
    if (evaluation) {
      const stars = '★'.repeat(evaluation.power || 0);
      body += `属性：${evaluation.element}　${evaluation.rarity}　${stars}\n`;
    }
    body += '#詠唱メーカー';
  }
  body += '\nhttps://eishou-maker.vercel.app';
  // X の280字制限を超えないように切る
  if (body.length > 270) body = body.slice(0, 267) + '...';
  return body;
}

function shareToX(text, type, evaluation) {
  const tweetText = buildShareText(text, type, evaluation);
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
}

function shareFromOverlay(btn) {
  if (!_lastChantOverlay) return;
  const { text, type, words, evaluation } = _lastChantOverlay;
  // 画像DLとXを同一クリックイベント内で同時実行（ポップアップブロッカー対策）
  saveChantImage(text, words || [], type || '召喚', evaluation || null);
  shareToX(text, type, evaluation);
  btn.textContent = '↓ 画像をDLしてXへ貼ってね';
  setTimeout(() => { btn.textContent = '𝕏 シェア'; }, 3000);
}

function shareFromHistory(i) {
  const entry = getHistory()[i];
  if (!entry) return;
  saveChantImage(entry.text, entry.words || [], entry.type || '召喚', entry.evaluation || null);
  shareToX(entry.text, entry.type || '召喚', entry.evaluation || null);
}

function shareFromHof(i) {
  const entry = getHof()[i];
  if (!entry) return;
  saveChantImage(entry.text, entry.words || [], entry.type || '召喚', entry.evaluation || null);
  shareToX(entry.text, entry.type || '召喚', entry.evaluation || null);
}

// ESCキーで閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chantOverlayActive) {
    closeChantOverlay();
  }
});

// ── DALL-E 3 画像生成 ──
async function generateChantImage() {
  if (!_lastChantOverlay) return;
  if (!authState.isSubscriber) { twitchLogin(); return; }

  // 画像レート制限チェック
  if (getActiveImageRateLogs().length >= getImageRateMax()) {
    updateImageRateInfo();
    alert('画像生成のレート制限に達しました');
    return;
  }

  const btn = document.getElementById('chantGenImageBtn');
  const imageArea = document.getElementById('chantOvImage');

  btn.disabled = true;
  btn.textContent = '生成中...';
  imageArea.innerHTML = `<div class="chant-ov-image-loading"><div class="chant-ov-image-spinner"></div><p>AI画像を生成中...<br>少々お待ちください（10〜30秒）</p></div>`;
  imageArea.classList.add('visible');

  try {
    const { text, type, words: chantWords, evaluation, profile } = _lastChantOverlay;
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chantText: text,
        type: type || '召喚',
        element: evaluation ? evaluation.element : null,
        words: chantWords || [],
        profile: profile || null,
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    _lastGeneratedImageUrl = data.url;
    showGeneratedImage(imageArea, data.url);

    // フッターにDLボタン・スタンプボタン表示
    document.getElementById('chantDlImageBtn').style.display = '';
    document.getElementById('chantStampBtn').style.display = '';
    document.getElementById('chantStampHint').style.display = '';

    // オーバーレイ・履歴・殿堂に画像URLを反映
    if (_lastChantOverlay) _lastChantOverlay.imageUrl = data.url;
    if (_currentChantId) {
      const history = getHistory();
      const hi = history.findIndex(e => e.id === _currentChantId);
      if (hi !== -1) {
        history[hi].imageUrl = data.url;
        localStorage.setItem('chant_history', JSON.stringify(history));
      }
      const hof = getHof();
      const hofi = hof.findIndex(e => e.id === _currentChantId || e.sourceId === _currentChantId);
      if (hofi !== -1) {
        hof[hofi].imageUrl = data.url;
        saveHof(hof);
      }
      renderHistory();
    }

    addImageRateLog();
    btn.textContent = 'AI画像を生成';
    btn.disabled = false;
  } catch (e) {
    imageArea.innerHTML = `<div class="chant-ov-image-error">${esc(e.message)}</div>`;
    imageArea.classList.add('visible');
    btn.textContent = 'AI画像を生成';
    btn.disabled = false;
  }
}

function showGeneratedImage(container, url) {
  const wrap = document.createElement('div');
  wrap.className = 'chant-ov-image-wrap';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '詠唱画像';
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => {
    container.innerHTML = '<div class="chant-ov-image-error">画像の読み込みに失敗しました</div>';
    container.classList.add('visible');
  };
  wrap.appendChild(img);
  container.innerHTML = '';
  container.appendChild(wrap);
  container.classList.add('visible');
}

function downloadLastGeneratedImage() {
  if (!_lastGeneratedImageUrl) return;
  const type = _lastChantOverlay ? _lastChantOverlay.type : '召喚';
  const a = document.createElement('a');
  a.href = _lastGeneratedImageUrl;
  a.download = `詠唱画像_${type}_${Date.now()}.png`;
  a.target = '_blank';
  a.click();
}
function makeStamp() {
  // window.openをユーザー操作の同期コールスタック内で先に呼ぶ（ポップアップブロック回避）
  const win = window.open('https://twitch-emote-generator.vercel.app/', '_blank');
  if (!win) {
    // ブロックされた場合はリンクで案内
    alert('ポップアップがブロックされました。ブラウザの設定で許可してください。');
  }
  downloadLastGeneratedImage();
}

async function runCountdown(type) {
  const overlay = document.getElementById('countdownOverlay');
  const numEl = document.getElementById('countdownNumber');
  const labelEl = document.getElementById('countdownLabel');
  const color = COUNTDOWN_TYPE_COLORS[type] || COUNTDOWN_TYPE_COLORS['召喚'];
  numEl.style.color = color;
  labelEl.style.color = color;
  overlay.classList.add('active');
  await sleep(500);
  for (const num of ['3', '2', '1']) {
    numEl.textContent = num;
    sfx.wordSelected();
    numEl.animate([
      { clipPath: 'inset(0 0 100% 0)', opacity: 0.8 },
      { clipPath: 'inset(0 0 0% 0)', opacity: 1 }
    ], { duration: 600, easing: 'cubic-bezier(0.2, 0, 0.1, 1)', fill: 'forwards' });
    await sleep(800);
    numEl.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-30px)' }
    ], { duration: 300, fill: 'forwards' });
    await sleep(300);
  }
  sfx.ritualStart(type);
  labelEl.animate([
    { clipPath: 'inset(0 100% 0 0)', opacity: 0.8 },
    { clipPath: 'inset(0 0% 0 0)', opacity: 1 }
  ], { duration: 500, easing: 'cubic-bezier(0.2, 0, 0.1, 1)', fill: 'forwards' });
  await sleep(1000);
  labelEl.animate([
    { opacity: 1 }, { opacity: 0 }
  ], { duration: 300, fill: 'forwards' });
  await sleep(300);
  overlay.classList.remove('active');
  numEl.style.opacity = '0';
  labelEl.style.opacity = '0';
}

const ELEMENT_COLORS = {
  '闇': '#6A3A8A', '光': '#C8A050', '炎': '#C84B4B', '氷': '#4B8AC8', '雷': '#C8C04B',
  '風': '#4BC8A0', '土': '#8A6A3A', '混沌': '#8A3A6A', '神聖': '#C8B87A',
  '血': '#8A1A1A', '夢': '#6A5A9A', '虚無': '#5A5A7A'
};
const RARITY_COLORS = {
  'コモン': '#888888', 'アンコモン': '#4B8A4B', 'レア': '#4B6AC8',
  'スーパーレア': '#8A4BC8', 'レジェンド': '#C8A050'
};

let currentEvaluation = null;

function showEvaluation(evaluation) {
  const el = document.getElementById('evalArea');
  currentEvaluation = evaluation;
  if (!evaluation) { el.classList.remove('visible'); el.innerHTML = ''; return; }
  const elemColor = ELEMENT_COLORS[evaluation.element] || '#888';
  const rarColor = RARITY_COLORS[evaluation.rarity] || '#888';
  const power = evaluation.power || 0;
  const stars = '★'.repeat(power) + '☆'.repeat(5 - power);
  el.innerHTML = `<span class="eval-element" style="background:${elemColor};color:#fff;">${esc(evaluation.element)}</span><span class="eval-power">${stars}</span><span class="eval-rarity" style="color:${rarColor}">${esc(evaluation.rarity)}</span>`;
  el.classList.add('visible');
}

function showResultWithTyping(text) {
  const container = document.getElementById('resultText');
  container.innerHTML = '';
  const lines = text.split(/\\n|\n/).map(s => s.trim()).filter(Boolean);
  const charDelay = 50;
  let cumulativeStart = 0;

  lines.forEach((line, i) => {
    const lineEl = document.createElement('div');
    lineEl.style.opacity = '0';
    lineEl.style.transition = 'opacity 0.2s';
    const spans = [];
    line.split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      span.style.transition = 'opacity 0.12s ease-in';
      lineEl.appendChild(span);
      spans.push(span);
    });
    container.appendChild(lineEl);

    const lineStart = cumulativeStart;
    cumulativeStart += spans.length * charDelay + 300;

    setTimeout(() => {
      lineEl.style.opacity = '1';
      spans.forEach((sp, ci) => {
        setTimeout(() => {
          sp.style.opacity = '1';
          sp.style.textShadow = '0 0 8px rgba(var(--gold-bright-r),var(--gold-bright-g),var(--gold-bright-b),0.5)';
          setTimeout(() => { sp.style.textShadow = ''; sp.style.transition = 'opacity 0.12s, text-shadow 0.4s'; }, 150);
        }, ci * charDelay);
      });
    }, lineStart);
  });
}

async function generate() {
  const isIntro = selectedType === '自己紹介';
  const isProfileMode = isIntro && selfIntroMode === 'profile';
  console.log('[generate] called. selected:', selected.length, 'type:', selectedType, 'mode:', selfIntroMode, 'rateLogs:', getActiveRateLogs().length, '/', getRateMax());

  if (isProfileMode) {
    const pName = document.getElementById('profileName').value.trim();
    if (!pName) { alert('名前を入力してください'); return; }
  } else {
    if (selected.length === 0) { alert('単語を選択してください'); return; }
  }
  if (getActiveRateLogs().length >= getRateMax()) {
    updateRateInfo();
    if (!authState.isSubscriber) showToast('契約者になると20回/時に解放されます', 'info', 5000);
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.textContent = '儀式準備中...';
  if (bgmEnabled) sfx.stopBGM();

  function resetBtn() {
    btn.disabled = false;
    btn.textContent = '詠唱生成';
    updateRateInfo();
    if (bgmEnabled && sfx.enabled) sfx.startBGM();
  }

  // サイドカラムを暗転＆魔法陣を非表示
  dimSideColumns();
  document.getElementById('altarArea').style.display = 'none';

  // リクエストbody構築
  const requestBody = isProfileMode
    ? {
        type: '自己紹介',
        mode: 'profile',
        profile: {
          name: document.getElementById('profileName').value.trim(),
          activity: document.getElementById('profileActivity').value.trim(),
          strength: document.getElementById('profileStrength').value.trim(),
          keywords: document.getElementById('profileKeywords').value.trim()
        }
      }
    : isIntro
      ? { words: selected, type: '自己紹介', mode: 'kotodama' }
      : { words: selected, type: selectedType };

  // カウントダウンとAPI呼び出しを並行開始
  const apiPromise = fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  }).then(r => r.json());

  const countdownPromise = runCountdown(selectedType);

  try {
    // 両方完了を待つ
    const [, data] = await Promise.all([countdownPromise, apiPromise]);
    if (data.error) throw new Error(data.error);
    const text = data.text;
    const evaluation = data.evaluation || null;

    // 自動タイプ：AIが選んだタイプを使用
    const displayType = selectedType === '自動' && evaluation?.type
      ? evaluation.type
      : selectedType;

    // 結果プレビュー（パネル内）
    showResultWithTyping(text);
    showEvaluation(evaluation);
    document.getElementById('resultPreview').classList.add('visible');
    document.getElementById('altarPlaceholder').style.display = 'none';

    // 全画面演出オーバーレイ
    const historyWords = isIntro
      ? [document.getElementById('profileName').value.trim()].filter(Boolean)
      : [...selected];
    showChantOverlay(text, displayType, historyWords, evaluation);
    if (isProfileMode && _lastChantOverlay) {
      _lastChantOverlay.profile = requestBody.profile;
    }

    saveHistory({ text, words: historyWords, type: displayType, timestamp: Date.now(), evaluation, imageUrl: _lastGeneratedImageUrl || null });
    updateSessionData(text, evaluation);
    addRateLog();
    applyChainAfterGenerate();

    if (speechEnabled && 'speechSynthesis' in window) {
      speakChant(text, resetBtn, resetBtn);
      // 安全弁：30秒後にspeechが終わらなかったら強制リセット
      setTimeout(() => { if (btn.disabled) resetBtn(); }, 30000);
      return;
    }
  } catch (e) {
    console.error('[generate] error:', e);
    alert('エラー: ' + e.message);
    // エラー時はサイドカラムと魔法陣を復帰
    restoreSideColumns();
    document.getElementById('altarArea').style.display = '';
  }
  resetBtn();
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('chant_history') || '[]'); } catch { return []; }
}
function saveHistory(entry) {
  if (!entry.id) entry.id = `chant_${Date.now()}`;
  _currentChantId = entry.id;
  const history = [entry, ...getHistory()].slice(0, 5);
  localStorage.setItem('chant_history', JSON.stringify(history));
  renderHistory();
}
// ── スクリーンショット機能 ──
const IMAGE_TYPE_COLORS = {
  '自動': '#C8A050', '召喚': '#C8A050', '解放': '#5ABAB4', '封印': '#9B7EC8',
  '滅亡': '#C84B4B', '覚醒': '#7AB87A', '自己紹介': '#B48CC8'
};

function getThemeBgBase() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim();
}
function getThemeBgWindow() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg-window').trim();
}
function getThemeFgBase() {
  return getComputedStyle(document.documentElement).getPropertyValue('--fg-base').trim();
}

async function saveChantImage(chantText, words, type, evaluation) {
  const typeColor = IMAGE_TYPE_COLORS[type] || '#C8A050';
  const canvasEl = document.createElement('div');
  canvasEl.style.cssText = `
    position: fixed; left: -9999px; width: 1200px; height: 675px;
    background: ${getThemeBgBase()};
    background-image: radial-gradient(ellipse at 20% 50%, rgba(var(--teal-r),var(--teal-g),var(--teal-b),0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.06) 0%, transparent 60%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Zen Kaku Gothic New', sans-serif;
  `;
  const fgBase = getThemeFgBase();
  const linesHtml = chantText.split(/\\n|\n/).map(s => s.trim()).filter(Boolean).map(s => esc(s)).join('<br>');
  let evalHtml = '';
  if (evaluation) {
    const ec = ELEMENT_COLORS[evaluation.element] || '#888';
    const rc = RARITY_COLORS[evaluation.rarity] || '#888';
    const stars = '★'.repeat(evaluation.power || 0) + '☆'.repeat(5 - (evaluation.power || 0));
    evalHtml = `<div style="padding:4px 48px 12px;display:flex;align-items:center;justify-content:center;gap:16px;font-size:16px;">
      <span style="background:${ec};color:#fff;padding:3px 10px;font-weight:700;letter-spacing:0.1em;">${esc(evaluation.element)}</span>
      <span style="color:#C8A050;font-size:18px;letter-spacing:2px;">${stars}</span>
      <span style="color:${rc};font-weight:600;letter-spacing:0.1em;">${esc(evaluation.rarity)}</span>
    </div>`;
  }
  const displayWords = words.slice(0, 5).map(w => esc(w));
  const extraCount = words.length - 5;
  const wordsText = extraCount > 0
    ? [...displayWords, `他${extraCount}個`].join('　')
    : displayWords.join('　');
  canvasEl.innerHTML = `
    <div style="width:1100px;border:1px solid rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);background:${getThemeBgWindow()};position:relative;">
      <div style="position:absolute;top:-1px;left:-1px;width:20px;height:20px;border-top:2px solid var(--gold-bright);border-left:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;top:-1px;right:-1px;width:20px;height:20px;border-top:2px solid var(--gold-bright);border-right:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;bottom:-1px;left:-1px;width:20px;height:20px;border-bottom:2px solid var(--gold-bright);border-left:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:20px;height:20px;border-bottom:2px solid var(--gold-bright);border-right:2px solid var(--gold-bright);"></div>
      <div style="padding:8px 24px;border-bottom:1px solid rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.3);display:flex;justify-content:space-between;font-size:15px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.7);letter-spacing:0.2em;">
        <span>詠唱システム</span><span style="color:${typeColor}">${type}</span>
      </div>
      <div style="padding:24px 48px 20px;font-family:'Yuji Syuku',serif;font-size:32px;line-height:2.6;color:${fgBase};text-align:center;letter-spacing:0.05em;">${linesHtml}</div>
      <div style="margin:4px 64px;height:1px;background:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.2);"></div>
      <div style="padding:10px 48px 16px;font-size:15px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);text-align:center;letter-spacing:0.15em;">${wordsText}</div>
      ${evalHtml}
    </div>
    <div style="position:absolute;bottom:20px;right:24px;font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.4);letter-spacing:0.1em;">詠唱メーカー</div>
  `;
  document.body.appendChild(canvasEl);
  await document.fonts.ready;
  const canvas = await html2canvas(canvasEl, {
    width: 1200, height: 675, scale: 1,
    backgroundColor: getThemeBgBase(), useCORS: true, allowTaint: true
  });
  document.body.removeChild(canvasEl);
  const link = document.createElement('a');
  link.download = `詠唱_${type}_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function saveCurrentChantImage() {
  const text = document.getElementById('resultText').textContent;
  if (!text) return;
  const imgType = selectedType === '自動' && currentEvaluation?.type
    ? currentEvaluation.type : selectedType;
  saveChantImage(text, [...selected], imgType, currentEvaluation);
}

function saveHistoryChantImage(i) {
  const entry = getHistory()[i];
  if (!entry) return;
  saveChantImage(entry.text, entry.words || [], entry.type || '召喚', entry.evaluation || null);
}

function deleteHistory(i) {
  const history = getHistory();
  history.splice(i, 1);
  localStorage.setItem('chant_history', JSON.stringify(history));
  renderHistory();
}
function replayChant(i) {
  const entry = getHistory()[i];
  if (!entry) return;
  showChantOverlay(entry.text, entry.type || '召喚', entry.words || [], entry.evaluation || null, entry.imageUrl || null);
}
// グローバルカラーマップ（テーマで上書き）— renderHistory/runCountdownで参照するためここで定義
const COUNTDOWN_TYPE_COLORS = {
  '自動': '#C8A050', '召喚': '#C8A050', '解放': '#7AB8B0', '封印': '#8A7AA0',
  '滅亡': '#A05050', '覚醒': '#7A9A7A', '自己紹介': '#B48CC8'
};
const HISTORY_TYPE_BG = {
  '自動': 'rgba(160,120,48,0.05)', '召喚': 'rgba(160,120,48,0.05)',
  '解放': 'rgba(90,138,128,0.05)', '封印': 'rgba(106,90,138,0.05)',
  '滅亡': 'rgba(122,48,48,0.05)', '覚醒': 'rgba(90,122,90,0.05)',
  '自己紹介': 'rgba(180,140,200,0.05)'
};

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = getHistory();
  const hof = getHof();
  if (history.length === 0) { list.innerHTML = '<span class="placeholder-text">記録は白紙——儀式を始めよ</span>'; return; }
  list.innerHTML = '';
  history.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.style.background = HISTORY_TYPE_BG[entry.type] || HISTORY_TYPE_BG['召喚'];
    const time = new Date(entry.timestamp);
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    const tags = (entry.words || []).map(w => `<span class="history-tag">${esc(w)}</span>`).join('');
    const isHof = hof.some(h => h.text === entry.text && h.type === entry.type);
    const hofBtn = isHof
      ? `<button class="history-btn replay" style="color:var(--gold-bright);border-color:var(--gold);" onclick="toggleHof(${i})">\u{1F451} 封印済</button>`
      : `<button class="history-btn replay" onclick="toggleHof(${i})">封印する</button>`;
    const crownMark = isHof ? '\u{1F451} ' : '';
    const remixBtn = `<button class="history-btn replay remix-add-btn" onclick="addToRemixSlot(getHistory()[${i}])">融合</button>`;
    card.innerHTML = `<div class="history-chant">${crownMark}${esc(entry.text)}</div>
      <div class="history-meta"><div class="history-tags">${tags}<span class="history-time">${hh}:${mm}</span></div>
      <div class="history-actions"><button class="history-btn replay" onclick="copyHistoryChant(${i}, this)">複写</button><button class="history-btn replay" onclick="replayChant(${i})">再召喚</button><button class="history-btn replay" onclick="saveHistoryChantImage(${i})">刻印</button><button class="history-btn replay" onclick="shareFromHistory(${i})">𝕏</button>${hofBtn}${remixBtn}<button class="history-btn delete" onclick="deleteHistory(${i})">抹消</button></div></div>`;
    list.appendChild(card);
  });
}

// ── 殿堂入り機能 ──
const HOF_MAX = 20;
const HOF_RARITY_BG = {
  'レジェンド': 'rgba(var(--gold-bright-r),var(--gold-bright-g),var(--gold-bright-b),0.08)', 'スーパーレア': 'rgba(138,75,200,0.06)',
  'レア': 'rgba(75,106,200,0.06)', 'アンコモン': 'rgba(75,138,75,0.05)', 'コモン': 'rgba(100,100,100,0.04)'
};

function getHof() {
  try { return JSON.parse(localStorage.getItem('hall_of_fame') || '[]'); } catch { return []; }
}
function saveHof(hof) {
  localStorage.setItem('hall_of_fame', JSON.stringify(hof));
}

function toggleHof(historyIndex) {
  const history = getHistory();
  const entry = history[historyIndex];
  if (!entry) return;
  let hof = getHof();
  const existIdx = hof.findIndex(h => h.text === entry.text && h.type === entry.type);
  if (existIdx !== -1) {
    hof.splice(existIdx, 1);
  } else {
    if (hof.length >= HOF_MAX) hof.shift();
    hof.push({
      id: 'hof_' + Date.now(),
      sourceId: entry.id || null,
      text: entry.text,
      words: entry.words || [],
      type: entry.type || '召喚',
      evaluation: entry.evaluation || null,
      imageUrl: entry.imageUrl || null,
      registeredAt: Date.now()
    });
  }
  saveHof(hof);
  renderHistory();
  renderHof();
}

function renderHof() {
  const list = document.getElementById('hofList');
  const hof = getHof();
  document.getElementById('hofClearBtn').style.display = hof.length > 0 ? '' : 'none';
  if (hof.length === 0) { list.innerHTML = '<span class="placeholder-text" style="color:var(--fg-dim);font-size:14px;">封印された詠唱はない</span>'; return; }
  list.innerHTML = '';
  hof.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'hof-card';
    const bg = entry.evaluation ? (HOF_RARITY_BG[entry.evaluation.rarity] || 'rgba(100,100,100,0.04)') : 'rgba(100,100,100,0.04)';
    card.style.background = bg;
    let evalHtml = '';
    if (entry.evaluation) {
      const ec = ELEMENT_COLORS[entry.evaluation.element] || '#888';
      const rc = RARITY_COLORS[entry.evaluation.rarity] || '#888';
      const stars = '★'.repeat(entry.evaluation.power || 0) + '☆'.repeat(5 - (entry.evaluation.power || 0));
      evalHtml = `<div class="hof-card-eval"><span class="elem" style="background:${ec}">${esc(entry.evaluation.element)}</span><span class="stars">${stars}</span><span class="rarity" style="color:${rc}">${esc(entry.evaluation.rarity)}</span></div>`;
    }
    card.innerHTML = `<div class="hof-card-num">${String(i + 1).padStart(2, '0')}</div>${evalHtml}<div class="hof-card-text">${esc(entry.text)}</div>
      <div class="hof-card-actions">
        <button onclick="replayHof(${i})">再召喚</button>
        <button onclick="copyHof(${i}, this)">複写</button>
        <button onclick="saveHofImage(${i})">刻印</button>
        <button onclick="shareFromHof(${i})">𝕏</button>
        <button class="remix-add-btn" onclick="addToRemixSlot(getHof()[${i}])">融合</button>
        <button class="hof-remove" onclick="removeHof(${i})">封印解除</button>
      </div>`;
    list.appendChild(card);
  });
}

function replayHof(i) {
  const entry = getHof()[i];
  if (!entry) return;
  showChantOverlay(entry.text, entry.type || '召喚', entry.words || [], entry.evaluation || null, entry.imageUrl || null);
}

function copyHof(i, btn) {
  const entry = getHof()[i];
  if (!entry) return;
  navigator.clipboard.writeText(entry.text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '複写済';
    setTimeout(() => { btn.textContent = orig; }, 1000);
  });
}

function saveHofImage(i) {
  const entry = getHof()[i];
  if (!entry) return;
  saveChantImage(entry.text, entry.words || [], entry.type || '召喚', entry.evaluation || null);
}

function removeHof(i) {
  const hof = getHof();
  hof.splice(i, 1);
  saveHof(hof);
  renderHof();
  renderHistory();
}

function clearHof() {
  saveHof([]);
  renderHof();
  renderHistory();
}

renderHof();

let selfIntroMode = 'kotodama';

function setSelfIntroMode(mode) {
  selfIntroMode = mode;
  if (mode === 'kotodama') {
    document.querySelector('.altar-left').style.visibility = 'visible';
    document.getElementById('selectedArea').style.display = '';
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('mode-kotodama').classList.add('active');
    document.getElementById('mode-profile').classList.remove('active');
    document.getElementById('altarPlaceholder').textContent = '── 言霊を選び、魂を刻め ──';
  } else {
    document.querySelector('.altar-left').style.visibility = 'hidden';
    document.getElementById('selectedArea').style.display = 'none';
    document.getElementById('profileForm').style.display = '';
    document.getElementById('mode-kotodama').classList.remove('active');
    document.getElementById('mode-profile').classList.add('active');
    document.getElementById('altarPlaceholder').textContent = '── 己を刻み、魂を解き放て ──';
  }
}

function selectType(btn) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedType = btn.dataset.type;
  const toggle = document.getElementById('selfintro-mode-toggle');
  if (selectedType === '自己紹介') {
    toggle.style.display = 'flex';
    setSelfIntroMode('kotodama');
  } else {
    toggle.style.display = 'none';
    document.querySelector('.altar-left').style.visibility = 'visible';
    document.getElementById('selectedArea').style.display = '';
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('altarPlaceholder').textContent = '── 言霊を選び、儀式を起動せよ ──';
  }
}
function toggleSpeech() {
  speechEnabled = !speechEnabled;
  document.getElementById('speechToggle').classList.toggle('active', speechEnabled);
}


// ── 読み上げ設定 ──
function speakChant(text, onEnd, onError) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = parseFloat(localStorage.getItem('speech_rate') || '0.75');
    utterance.pitch = parseFloat(localStorage.getItem('speech_pitch') || '0.8');
    utterance.volume = 1.0;
    const savedVoice = localStorage.getItem('speech_voice');
    if (savedVoice) {
      const voice = speechSynthesis.getVoices().find(v => v.name === savedVoice);
      if (voice) utterance.voice = voice;
    }
    if (onEnd) utterance.onend = onEnd;
    if (onError) utterance.onerror = onError;
    speechSynthesis.speak(utterance);
  }, 100);
}

function testSpeech() {
  speakChant('汝の名は混沌——今こそ目覚めよ！');
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  const select = document.getElementById('speech-voice');
  if (!select || voices.length === 0) return;
  select.innerHTML = '';
  const jaVoices = voices.filter(v => v.lang.startsWith('ja'));
  const otherVoices = voices.filter(v => !v.lang.startsWith('ja'));
  [...jaVoices, ...otherVoices].forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    select.appendChild(option);
  });
  // 保存済みの声を復元、なければ最初の日本語声
  const saved = localStorage.getItem('speech_voice');
  if (saved && voices.find(v => v.name === saved)) {
    select.value = saved;
  } else if (jaVoices.length > 0) {
    select.value = jaVoices[0].name;
  }
}
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}

// 設定スライダーのイベント
// 読み上げ設定（設定モーダル内の要素はDOMContentLoaded後に初期化）
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('speech-rate').addEventListener('input', e => {
    document.getElementById('speech-rate-val').textContent = e.target.value;
    localStorage.setItem('speech_rate', e.target.value);
  });
  document.getElementById('speech-pitch').addEventListener('input', e => {
    document.getElementById('speech-pitch-val').textContent = e.target.value;
    localStorage.setItem('speech_pitch', e.target.value);
  });
  document.getElementById('speech-voice').addEventListener('change', e => {
    localStorage.setItem('speech_voice', e.target.value);
  });
  // 設定の復元
  const rate = localStorage.getItem('speech_rate') || '0.75';
  const pitch = localStorage.getItem('speech_pitch') || '0.8';
  document.getElementById('speech-rate').value = rate;
  document.getElementById('speech-rate-val').textContent = rate;
  document.getElementById('speech-pitch').value = pitch;
  document.getElementById('speech-pitch-val').textContent = pitch;
});
const guideEnabled = true;

// SE controls
const seToggleEl = document.getElementById('seToggle');
const seVolumeEl = document.getElementById('seVolume');
seToggleEl.classList.toggle('active', sfx.enabled);
seVolumeEl.value = sfx.volume * 100;
if (!sfx.enabled) seVolumeEl.classList.add('disabled');

function toggleSE() {
  sfx.setEnabled(!sfx.enabled);
  seToggleEl.classList.toggle('active', sfx.enabled);
  seVolumeEl.classList.toggle('disabled', !sfx.enabled);
  if (sfx.enabled && bgmEnabled) sfx.startBGM();
}
function setSEVolume(val) {
  sfx.setVolume(val / 100);
}

// BGM controls
let bgmEnabled = localStorage.getItem('bgm_enabled') !== 'false';
const bgmToggleEl = document.getElementById('bgmToggle');
bgmToggleEl.classList.toggle('active', bgmEnabled);

function toggleBGM() {
  bgmEnabled = !bgmEnabled;
  localStorage.setItem('bgm_enabled', bgmEnabled);
  bgmToggleEl.classList.toggle('active', bgmEnabled);
  if (bgmEnabled && sfx.enabled) {
    sfx.startBGM();
  } else {
    sfx.stopBGM();
  }
}

// ページ読み込み時にBGM自動開始（ユーザー操作で初期化）
document.addEventListener('click', function initBGM() {
  if (bgmEnabled && sfx.enabled) sfx.startBGM();
  document.removeEventListener('click', initBGM);
}, { once: true });

function doCopy(text, btn) {
  sfx.uiConfirm();
  const orig = btn.textContent;
  const showSuccess = () => {
    btn.textContent = '完了';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(showSuccess).catch(() => { fallbackCopy(text); showSuccess(); });
  } else { fallbackCopy(text); showSuccess(); }
}
function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
function copyChant() {
  doCopy(document.getElementById('resultText').textContent, document.getElementById('copyBtn'));
}
function copyHistoryChant(i, btn) {
  const entry = getHistory()[i];
  if (entry) doCopy(entry.text, btn);
}

renderHistory();

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── 儀式の手引きモーダル ──
if (!localStorage.getItem('ritual_initiated')) {
  setTimeout(() => {
    document.getElementById('ritualModalBg').classList.add('visible');
  }, 300);
}
function closeRitualGuideModal() {
  localStorage.setItem('ritual_initiated', '1');
  document.getElementById('ritualModalBg').classList.remove('visible');
}

// ── セッションリザルト ──
function initSessionData() {
  if (!sessionStorage.getItem('session_initialized')) {
    sessionStorage.setItem('session_chant_count', '0');
    sessionStorage.setItem('session_elements', '[]');
    sessionStorage.setItem('session_rarities', '[]');
    sessionStorage.setItem('session_best_chant', '');
    sessionStorage.setItem('session_best_chant_rarity', '');
    sessionStorage.setItem('session_initialized', '1');
  }
}
initSessionData();

function updateSessionData(chantText, evaluation) {
  const count = parseInt(sessionStorage.getItem('session_chant_count') || '0');
  sessionStorage.setItem('session_chant_count', String(count + 1));
  if (evaluation?.element) {
    const elements = JSON.parse(sessionStorage.getItem('session_elements') || '[]');
    elements.push(evaluation.element);
    sessionStorage.setItem('session_elements', JSON.stringify(elements));
  }
  if (evaluation?.rarity) {
    const rarities = JSON.parse(sessionStorage.getItem('session_rarities') || '[]');
    rarities.push(evaluation.rarity);
    sessionStorage.setItem('session_rarities', JSON.stringify(rarities));
  }
  const rarityRank = ['レジェンド', 'スーパーレア', 'レア', 'アンコモン', 'コモン'];
  const current = sessionStorage.getItem('session_best_chant_rarity') || '';
  const currentIdx = rarityRank.indexOf(current);
  const newIdx = rarityRank.indexOf(evaluation?.rarity || '');
  if (newIdx !== -1 && (currentIdx === -1 || newIdx < currentIdx)) {
    sessionStorage.setItem('session_best_chant', chantText);
    sessionStorage.setItem('session_best_chant_rarity', evaluation.rarity);
  }
}

function collectResultData() {
  const count = parseInt(sessionStorage.getItem('session_chant_count') || '0');
  const rarities = JSON.parse(sessionStorage.getItem('session_rarities') || '[]');
  const rarityRank = ['レジェンド', 'スーパーレア', 'レア', 'アンコモン', 'コモン'];
  let topRarity = '—';
  for (const r of rarityRank) { if (rarities.includes(r)) { topRarity = r; break; } }

  const elements = [...new Set(JSON.parse(sessionStorage.getItem('session_elements') || '[]'))].slice(0, 4);

  const hof = getHof();
  const topHof = (hof.length > 0 ? hof[hof.length - 1].text : null)
    || sessionStorage.getItem('session_best_chant') || null;

  const mvp = getMvp();
  const wordEntries = Object.entries(wordVotes || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return { count, topRarity, elements, topHof, mvp, wordEntries };
}

function showResultModal() {
  const d = collectResultData();
  const body = document.getElementById('resultModalBody');
  let html = '';

  html += `<div class="result-stat"><span class="result-stat-label">詠唱回数</span><span class="result-stat-value">${d.count}回</span></div>`;
  html += `<div class="result-stat"><span class="result-stat-label">最高レアリティ</span><span class="result-stat-value">${esc(d.topRarity)}</span></div>`;
  html += `<div class="result-stat"><span class="result-stat-label">使用属性</span><span class="result-stat-value">${d.elements.length > 0 ? d.elements.map(e => esc(e)).join('・') : '—'}</span></div>`;

  if (d.topHof) {
    html += `<div class="result-section-title">── 今宵の殿堂 ──</div>`;
    const firstLine = d.topHof.split('\n')[0];
    html += `<div class="result-chant">${esc(firstLine)}——</div>`;
  }

  if (d.mvp) {
    html += `<div class="result-section-title">── MVP ──</div>`;
    html += `<div class="result-stat"><span class="result-stat-label">\u{1F451} ${esc(d.mvp.username)}</span><span class="result-stat-value">スコア ${d.mvp.score}</span></div>`;
  }

  if (d.wordEntries.length > 0) {
    html += `<div class="result-section-title">── 人気言霊 Top3 ──</div>`;
    d.wordEntries.forEach(([word, votes], i) => {
      html += `<div class="result-rank"><span class="result-rank-word">${i + 1}位　${esc(word)}</span><span>${votes}票</span></div>`;
    });
  }

  if (d.count === 0 && !d.mvp && d.wordEntries.length === 0) {
    html += `<div class="result-empty">まだ儀式は始まっていない——</div>`;
  }

  body.innerHTML = html;
  document.getElementById('resultModalBg').classList.add('visible');
}

function closeResultModal() {
  document.getElementById('resultModalBg').classList.remove('visible');
}

async function saveResultImage() {
  const d = collectResultData();
  const el = document.createElement('div');
  const bgBase = getThemeBgBase();
  const fgBase = getThemeFgBase();
  el.style.cssText = `
    position: fixed; left: -9999px; width: 1200px; height: 675px;
    background: ${bgBase};
    background-image: radial-gradient(ellipse at 20% 50%, rgba(var(--teal-r),var(--teal-g),var(--teal-b),0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.06) 0%, transparent 60%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Zen Kaku Gothic New', sans-serif;
  `;

  let statsHtml = `
    <div style="display:flex;gap:40px;margin:16px 0 20px;">
      <div style="text-align:center;"><div style="font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);">詠唱回数</div><div style="font-size:28px;color:${fgBase};font-weight:700;margin-top:4px;">${d.count}</div></div>
      <div style="text-align:center;"><div style="font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);">最高レアリティ</div><div style="font-size:20px;color:var(--gold-bright);font-weight:600;margin-top:8px;">${esc(d.topRarity)}</div></div>
      <div style="text-align:center;"><div style="font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);">使用属性</div><div style="font-size:16px;color:${fgBase};margin-top:8px;">${d.elements.length > 0 ? d.elements.map(e => esc(e)).join(' · ') : '—'}</div></div>
    </div>`;

  let hofHtml = '';
  if (d.topHof) {
    const firstLine = d.topHof.split('\n')[0];
    hofHtml = `
      <div style="margin:12px 0 8px;font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);letter-spacing:0.15em;">── 今宵の殿堂 ──</div>
      <div style="font-family:'Yuji Syuku',serif;font-size:22px;color:${fgBase};letter-spacing:0.05em;">${esc(firstLine)}——</div>`;
  }

  let mvpHtml = '';
  if (d.mvp) {
    mvpHtml = `<div style="margin:16px 0 4px;font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);letter-spacing:0.15em;">── MVP ──</div>
      <div style="font-size:18px;color:${fgBase};">\u{1F451} ${esc(d.mvp.username)}（スコア ${d.mvp.score}）</div>`;
  }

  let wordsHtml = '';
  if (d.wordEntries.length > 0) {
    wordsHtml = `<div style="margin:16px 0 8px;font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);letter-spacing:0.15em;">── 人気言霊 Top3 ──</div>`;
    d.wordEntries.forEach(([word, votes], i) => {
      wordsHtml += `<div style="font-size:16px;color:${fgBase};padding:2px 0;">${i + 1}位　${esc(word)}（${votes}票）</div>`;
    });
  }

  el.innerHTML = `
    <div style="width:1000px;border:1px solid rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.6);background:${getThemeBgWindow()};position:relative;padding:32px 48px;">
      <div style="position:absolute;top:-1px;left:-1px;width:20px;height:20px;border-top:2px solid var(--gold-bright);border-left:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;top:-1px;right:-1px;width:20px;height:20px;border-top:2px solid var(--gold-bright);border-right:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;bottom:-1px;left:-1px;width:20px;height:20px;border-bottom:2px solid var(--gold-bright);border-left:2px solid var(--gold-bright);"></div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:20px;height:20px;border-bottom:2px solid var(--gold-bright);border-right:2px solid var(--gold-bright);"></div>
      <div style="text-align:center;font-family:'Yuji Syuku',serif;font-size:22px;color:var(--gold-bright);letter-spacing:0.2em;">── 今宵の儀式は終わった ──</div>
      ${statsHtml}
      <div style="margin:8px 0;height:1px;background:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.2);"></div>
      ${hofHtml}${mvpHtml}${wordsHtml}
      <div style="margin-top:16px;height:1px;background:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.2);"></div>
      <div style="margin-top:12px;text-align:center;font-size:14px;color:rgba(var(--gold-r),var(--gold-g),var(--gold-b),0.5);letter-spacing:0.1em;">#詠唱メーカー　eishou-maker.vercel.app</div>
    </div>`;

  document.body.appendChild(el);
  await document.fonts.ready;
  const canvas = await html2canvas(el, { width: 1200, height: 675, scale: 1, backgroundColor: getThemeBgBase(), useCORS: true, allowTaint: true });
  document.body.removeChild(el);
  const link = document.createElement('a');
  link.download = `儀式リザルト_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function shareResultToX(btn) {
  const d = collectResultData();
  let text = `今宵の儀式は終わった——\n\n詠唱回数：${d.count}回\n最高レアリティ：${d.topRarity}`;
  if (d.elements.length > 0) text += `\n使用属性：${d.elements.join('・')}`;
  text += `\n\n#詠唱メーカー\nhttps://eishou-maker.vercel.app`;
  saveResultImage();
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  btn.textContent = '↓ 画像をDLしてXへ貼ってね';
  setTimeout(() => { btn.textContent = '𝕏 シェア'; }, 3000);
}

// ── 魔法陣キャンバス ──
const ALTAR_TYPE_COLORS = {
  '自動': [160, 120, 48],
  '召喚': [160, 120, 48],
  '解放': [90, 138, 128],
  '封印': [106, 90, 138],
  '滅亡': [122, 48, 48],
  '覚醒': [90, 122, 90],
  '自己紹介': [180, 140, 200]
};

// ── テーマシステム ──
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


// ページ読み込み時にテーマ復元
applyTheme(localStorage.getItem('theme') || 'tasogare');

function getTypeColor() {
  return ALTAR_TYPE_COLORS[selectedType] || ALTAR_TYPE_COLORS['召喚'];
}

let altarAnimId = null;
const altarCanvas = document.getElementById('altarCanvas');
const altarCtx = altarCanvas ? altarCanvas.getContext('2d') : null;

function resizeAltarCanvas() {
  if (!altarCanvas) return;
  const area = document.getElementById('altarArea');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  altarCanvas.width = rect.width * dpr;
  altarCanvas.height = rect.height * dpr;
  altarCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

if (altarCanvas) {
  const altarAreaEl = document.getElementById('altarArea');
  if (altarAreaEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeAltarCanvas()).observe(altarAreaEl);
  }
  resizeAltarCanvas();
}

function drawAltarCircle(time) {
  if (!altarCtx || !altarCanvas) return;
  const area = document.getElementById('altarArea');
  if (!area) return;
  const w = area.clientWidth;
  const h = area.clientHeight;
  altarCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) * 0.7;
  const [r, g, b] = getTypeColor();

  // Opacity scales with selected word count
  const wordCount = selected.length;
  const alpha = Math.min(0.60, 0.20 + (wordCount / 10) * 0.40);

  // Outer rotating dashed circle
  altarCtx.save();
  altarCtx.translate(cx, cy);
  altarCtx.rotate(time * 0.0003);
  altarCtx.beginPath();
  altarCtx.arc(0, 0, radius, 0, Math.PI * 2);
  altarCtx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
  altarCtx.lineWidth = 1.5;
  altarCtx.setLineDash([8, 12]);
  altarCtx.stroke();
  altarCtx.restore();

  // Inner rotating dashed circle (opposite direction)
  altarCtx.save();
  altarCtx.translate(cx, cy);
  altarCtx.rotate(-time * 0.0005);
  altarCtx.beginPath();
  altarCtx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
  altarCtx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
  altarCtx.lineWidth = 1;
  altarCtx.setLineDash([4, 8]);
  altarCtx.stroke();
  altarCtx.restore();

  // Crosshairs
  altarCtx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.4})`;
  altarCtx.lineWidth = 0.8;
  altarCtx.setLineDash([]);
  altarCtx.beginPath();
  altarCtx.moveTo(cx - radius * 0.3, cy);
  altarCtx.lineTo(cx + radius * 0.3, cy);
  altarCtx.moveTo(cx, cy - radius * 0.3);
  altarCtx.lineTo(cx, cy + radius * 0.3);
  altarCtx.stroke();

  // Center dot
  altarCtx.beginPath();
  altarCtx.arc(cx, cy, 2, 0, Math.PI * 2);
  altarCtx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  altarCtx.fill();
}

function altarLoop(time) {
  drawAltarCircle(time);
  altarAnimId = requestAnimationFrame(altarLoop);
}

// Start the altar animation
if (altarCanvas) {
  altarAnimId = requestAnimationFrame(altarLoop);
}

// ── サイドカラム演出 ──
function dimSideColumns() {
  document.querySelectorAll('.altar-left, .altar-right').forEach(col => {
    col.classList.remove('restoring');
    col.classList.add('dimmed');
  });
}

function restoreSideColumns() {
  document.querySelectorAll('.altar-left, .altar-right').forEach(col => {
    col.classList.add('restoring');
    col.classList.remove('dimmed');
    // Remove restoring class after transition completes
    setTimeout(() => col.classList.remove('restoring'), 500);
  });
}

// ── 詠唱バトル ──
let battleMode = false;
let battleWords = { red: [], blue: [] };
let battleSelected = { red: [], blue: [] };

function toggleBattleMode() {
  // リミックスモード中なら先に解除
  if (remixMode) toggleRemixMode();

  battleMode = !battleMode;
  const btn = document.getElementById('battleBtn');
  btn.classList.toggle('active', battleMode);
  if (battleMode) {
    btn.textContent = 'バトル終了';
    btn.style.borderColor = 'var(--gold)';
    btn.style.color = 'var(--gold)';
  } else {
    btn.textContent = 'バトル';
    btn.style.borderColor = '';
    btn.style.color = '';
  }

  document.getElementById('normal-left-ui').style.display = battleMode ? 'none' : '';
  document.getElementById('battle-left-ui').style.display = battleMode ? 'flex' : 'none';
  document.getElementById('normal-center-ui').style.display = battleMode ? 'none' : '';
  document.getElementById('battle-center-ui').style.display = battleMode ? 'flex' : 'none';

  if (!battleMode) resetBattle();
}

function resetBattle() {
  battleWords = { red: [], blue: [] };
  battleSelected = { red: [], blue: [] };
  renderBattleWords('red');
  renderBattleWords('blue');
  updateBattlePreview();
  document.getElementById('battle-result-area').style.display = 'none';
  document.getElementById('battle-result-area').innerHTML = '';
  const btn = document.getElementById('battle-start-btn');
  btn.disabled = false;
  btn.textContent = '⚔ バトル開始';
  // 魔法陣アニメーション再開
  if (!altarAnimId && altarCanvas) {
    altarAnimId = requestAnimationFrame(altarLoop);
  }
}

function addBattleWordManual(team) {
  const input = document.getElementById(`${team}-manual-input`);
  const word = input.value.trim().substring(0, 20);
  if (!word) return;
  addBattleWord(team, word, 'manual');
  input.value = '';
}

function addBattleWord(team, word, username) {
  if (battleWords[team].find(w => w.word === word)) return;
  battleWords[team].push({ word, username });
  renderBattleWords(team);
}

function toggleBattleWordSelect(team, word) {
  const idx = battleSelected[team].indexOf(word);
  if (idx >= 0) {
    battleSelected[team].splice(idx, 1);
  } else {
    if (battleSelected[team].length >= 10) return;
    battleSelected[team].push(word);
  }
  renderBattleWords(team);
  updateBattlePreview();
}

function renderBattleWords(team) {
  const area = document.getElementById(team === 'red' ? 'redWordsArea' : 'blueWordsArea');
  const selArea = document.getElementById(team === 'red' ? 'redSelectedWords' : 'blueSelectedWords');
  const cardClass = team === 'red' ? 'red-card' : 'blue-card';

  area.innerHTML = battleWords[team].map(w => {
    const isSelected = battleSelected[team].includes(w.word);
    return `<div class="battle-word-card ${cardClass}${isSelected ? ' selected' : ''}" onclick="toggleBattleWordSelect('${team}','${esc(w.word)}')">${esc(w.word)}</div>`;
  }).join('');

  selArea.innerHTML = battleSelected[team].length > 0
    ? battleSelected[team].map(w => `<span style="color:var(--fg-base);font-size:13px;">${esc(w)}</span>`).join('、')
    : '<span style="color:var(--fg-dim);font-size:12px;">未選択</span>';
}

function updateBattlePreview() {
  document.getElementById('battleRedPreview').textContent =
    battleSelected.red.length > 0 ? battleSelected.red.join('、') : '言霊を選べ...';
  document.getElementById('battleBluePreview').textContent =
    battleSelected.blue.length > 0 ? battleSelected.blue.join('、') : '言霊を選べ...';
}

async function startBattle() {
  if (battleSelected.red.length === 0 || battleSelected.blue.length === 0) {
    alert('両陣営に言霊が必要です');
    return;
  }

  // 魔法陣アニメーションを停止（html2canvas競合防止）
  if (altarAnimId) {
    cancelAnimationFrame(altarAnimId);
    altarAnimId = null;
  }

  const btn = document.getElementById('battle-start-btn');
  btn.disabled = true;
  btn.textContent = '詠唱中...';
  document.getElementById('battle-result-area').style.display = 'none';

  try {
    // カウントダウンとAPI呼び出しを並行実行
    const [, [redRes, blueRes]] = await Promise.all([
      runCountdown(selectedType),
      Promise.allSettled([
        fetch('/api/chant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ words: battleSelected.red, type: selectedType })
        }).then(r => r.json()),
        fetch('/api/chant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ words: battleSelected.blue, type: selectedType })
        }).then(r => r.json())
      ])
    ]);

    if (redRes.status === 'rejected' || blueRes.status === 'rejected') {
      throw new Error('詠唱の生成に失敗しました');
    }
    if (redRes.value.error || blueRes.value.error) {
      throw new Error(redRes.value.error || blueRes.value.error);
    }

    const redChant = redRes.value.text;
    const blueChant = blueRes.value.text;

    // 審判API呼び出し（バックグラウンドで開始、演出中に完了を待つ）
    const judgePromise = fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ red: redChant, blue: blueChant })
    }).then(r => r.json());

    // バトル演出を実行
    await runBattleAnimation(redChant, blueChant, judgePromise);

  } catch (err) {
    closeBattleOverlay();
    alert(err.message || 'バトルに失敗しました');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚔ バトル開始';
  }
}

// ── バトル演出メイン ──
let battleOverlayActive = false;
let lastBattleJudgment = null;

async function runBattleAnimation(redChant, blueChant, judgePromise) {
  battleOverlayActive = true;
  const bg = document.getElementById('battleOverlayBg');
  const win = document.getElementById('battleOverlayWindow');
  const typeEl = document.getElementById('battleOverlayType');

  // リセット
  document.getElementById('battleOvRedBody').innerHTML = '';
  document.getElementById('battleOvBlueBody').innerHTML = '';
  document.getElementById('battleOvRed').classList.remove('visible');
  document.getElementById('battleOvBlue').classList.remove('visible');
  document.getElementById('battleOvVs').classList.remove('visible');
  document.getElementById('battleOvJudging').classList.remove('visible');
  document.getElementById('battleOvWinner').classList.remove('visible');
  document.getElementById('battleOvActions').classList.remove('visible');
  document.getElementById('battleOverlayClose').classList.remove('visible');

  typeEl.textContent = selectedType || '召喚';
  const cfg = CHANT_TYPE_CONFIG[selectedType] || CHANT_TYPE_CONFIG['召喚'];
  typeEl.style.color = cfg.color;

  // オーバーレイ表示
  bg.classList.add('visible');
  await sleep(300);
  win.classList.add('visible');
  await sleep(400);

  // 赤陣営の詠唱を表示
  await showTeamChant('red', redChant);
  await sleep(600);

  // VS表示
  showVS();
  await sleep(800);

  // 青陣営の詠唱を表示
  await showTeamChant('blue', blueChant);
  await sleep(600);

  // 審判中表示
  showJudging();

  // 審判結果を待つ
  const judgment = await judgePromise;
  if (judgment.error) {
    closeBattleOverlay();
    throw new Error(judgment.error);
  }

  await sleep(1500); // 審判の間を演出
  document.getElementById('battleOvJudging').classList.remove('visible');
  await sleep(300);

  // 勝者発表
  showWinner(judgment);
  sfx.chantComplete(selectedType || '召喚');

  // 静的結果も中央カラムに残す
  showBattleResultStatic(redChant, blueChant, judgment);
}

async function showTeamChant(team, chantText) {
  const teamEl = document.getElementById(team === 'red' ? 'battleOvRed' : 'battleOvBlue');
  const bodyEl = document.getElementById(team === 'red' ? 'battleOvRedBody' : 'battleOvBlueBody');

  const lines = chantText.split(/\\n|\n/).map(s => s.trim()).filter(Boolean);
  bodyEl.innerHTML = '';
  const lineEls = lines.map(line => {
    const el = document.createElement('div');
    el.className = 'battle-overlay-chant-line';
    el.textContent = line;
    bodyEl.appendChild(el);
    return el;
  });

  teamEl.classList.add('visible');
  sfx.lineReveal(0, lines.length);

  // 各行を順番にクリップパスで表示
  for (let i = 0; i < lineEls.length; i++) {
    await sleep(200);
    lineEls[i].classList.add('revealed');
    if (i < lineEls.length - 1) sfx.lineReveal(i + 1, lineEls.length);
    await sleep(400);
  }
}

function showVS() {
  const el = document.getElementById('battleOvVs');
  el.classList.add('visible');
  sfx.wordSelected();
}

function showJudging() {
  const el = document.getElementById('battleOvJudging');
  el.classList.add('visible');
}

function showWinner(judgment) {
  lastBattleJudgment = judgment;
  const el = document.getElementById('battleOvWinner');
  const labelEl = document.getElementById('battleOvWinnerLabel');
  const reasonEl = document.getElementById('battleOvWinnerReason');

  const winnerText = judgment.winner === 'red' ? '赤陣営の勝利！'
    : judgment.winner === 'blue' ? '青陣営の勝利！'
    : '引き分け——両者の力は互角であった';

  labelEl.textContent = winnerText;
  labelEl.className = 'winner-label ' + (judgment.winner || 'draw');
  reasonEl.textContent = judgment.reason || '';

  el.classList.add('visible');

  // ×ボタンとアクション表示
  setTimeout(() => {
    document.getElementById('battleOverlayClose').classList.add('visible');
    document.getElementById('battleOvActions').classList.add('visible');
  }, 600);
}

function closeBattleOverlay() {
  battleOverlayActive = false;
  const bg = document.getElementById('battleOverlayBg');
  const win = document.getElementById('battleOverlayWindow');
  bg.classList.remove('visible');
  win.classList.remove('visible');
  // 魔法陣アニメーション再開
  if (!altarAnimId && altarCanvas) {
    altarAnimId = requestAnimationFrame(altarLoop);
  }
}

async function saveBattleResultImage() {
  await document.fonts.ready;
  const el = document.getElementById('battleOverlayWindow');
  if (!el) return;

  // fixed+transformだとhtml2canvasが正しく取得できないため
  // 一時的にstatic配置に切り替えてキャプチャ
  const orig = {
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    transform: el.style.transform,
    maxHeight: el.style.maxHeight,
  };
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  el.style.top = '0';
  el.style.transform = 'none';
  el.style.maxHeight = 'none';

  const canvas = await html2canvas(el, {
    scale: 1.5,
    backgroundColor: getThemeBgBase(),
    useCORS: true,
    allowTaint: true,
    scrollX: 0,
    scrollY: 0,
  });

  // スタイルを復元
  el.style.position = orig.position;
  el.style.left = orig.left;
  el.style.top = orig.top;
  el.style.transform = orig.transform;
  el.style.maxHeight = orig.maxHeight;

  const link = document.createElement('a');
  link.download = `詠唱バトル_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('バトル結果を保存しました', 'success', 2000);
}

function shareBattleResultToX() {
  saveBattleResultImage();
  const winnerText = lastBattleJudgment?.winner === 'red' ? '🔴 赤陣営の勝利！'
    : lastBattleJudgment?.winner === 'blue' ? '🔵 青陣営の勝利！'
    : '⚔ 引き分け——';
  const text = `${winnerText}\n\n#詠唱メーカー\nhttps://eishou-maker.vercel.app`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  setTimeout(() => window.open(url, '_blank'), 500);
}

function showBattleResultStatic(redChant, blueChant, judgment) {
  const area = document.getElementById('battle-result-area');
  const winnerLabel = judgment.winner === 'red' ? '赤陣営の勝利！'
    : judgment.winner === 'blue' ? '青陣営の勝利！'
    : '引き分け——両者の力は互角であった';
  const winnerClass = judgment.winner;

  area.innerHTML = `
    <div class="battle-result">
      <div class="battle-chant red-chant">
        <div class="chant-team-label">赤陣営</div>
        <div class="chant-text">${esc(redChant)}</div>
      </div>
      <div class="battle-vs">VS</div>
      <div class="battle-chant blue-chant">
        <div class="chant-team-label">青陣営</div>
        <div class="chant-text">${esc(blueChant)}</div>
      </div>
      <div class="battle-winner ${esc(winnerClass)}">
        ${esc(winnerLabel)}
      </div>
      <div class="battle-reason">${esc(judgment.reason || '')}</div>
      <div class="battle-actions">
        <button onclick="resetBattle()">もう一度バトル</button>
        <button onclick="toggleBattleMode()">通常モードに戻る</button>
      </div>
    </div>
  `;
  area.style.display = 'block';
}

// ── リミックス機能 ──
let remixMode = false;
let remixSlots = [null, null];

function toggleRemixMode() {
  // バトルモード中なら先に解除
  if (battleMode) toggleBattleMode();

  remixMode = !remixMode;
  const btn = document.getElementById('remixBtn');
  btn.classList.toggle('active', remixMode);

  document.getElementById('remix-center-ui').style.display = remixMode ? 'flex' : 'none';
  document.getElementById('normal-center-ui').style.display = remixMode ? 'none' : '';

  // 融合ボタンの表示切り替え（bodyにクラスを付与してCSSで制御）
  document.body.classList.toggle('remix-mode-active', remixMode);

  if (!remixMode) resetRemix();
}

function addToRemixSlot(entry) {
  if (!entry || !entry.text) return;
  const slotIndex = remixSlots[0] === null ? 0 : 1;
  remixSlots[slotIndex] = entry;
  updateRemixUI();
}

function updateRemixUI() {
  [0, 1].forEach(i => {
    const content = document.getElementById(`remix-slot-${i + 1}-content`);
    if (remixSlots[i]) {
      const firstLine = remixSlots[i].text.split('\n')[0];
      const preview = firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine;
      content.innerHTML = `<div class="remix-slot-text">${esc(preview)}</div><button onclick="clearRemixSlot(${i})" class="remix-clear-btn">&times;</button>`;
    } else {
      content.innerHTML = '<span class="remix-slot-empty">履歴または封印から選べ</span>';
    }
  });
  document.getElementById('remix-btn').disabled = remixSlots[0] === null || remixSlots[1] === null;
}

function clearRemixSlot(index) {
  remixSlots[index] = null;
  updateRemixUI();
}

function resetRemix() {
  remixSlots = [null, null];
  updateRemixUI();
}

async function startRemix() {
  if (!remixSlots[0] || !remixSlots[1]) return;

  const btn = document.getElementById('remix-btn');
  btn.disabled = true;
  btn.textContent = '融合中...';

  try {
    const countdownPromise = runCountdown('召喚');
    const apiPromise = fetch('/api/remix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        chant1: remixSlots[0].text,
        chant2: remixSlots[1].text
      })
    }).then(r => r.json());

    const [, data] = await Promise.all([countdownPromise, apiPromise]);
    if (data.error) throw new Error(data.error);

    const evaluation = data.evaluation || null;
    const displayType = evaluation?.type || '召喚';

    // 融合元の単語を結合
    const sourceWords = [
      ...(remixSlots[0].words || []),
      ...(remixSlots[1].words || [])
    ].slice(0, 10);

    showChantOverlay(data.text, displayType, sourceWords, evaluation);
    saveHistory({ text: data.text, words: sourceWords, type: displayType, timestamp: Date.now(), evaluation, imageUrl: null });
    addRateLog();
    updateRateInfo();
  } catch (err) {
    alert(err.message || '融合に失敗しました');
  } finally {
    btn.disabled = false;
    btn.textContent = '融 合';
  }
}

// ── トースト通知 ──
function copyCommands() {
  const text = battleMode
    ? '【詠唱バトル参加方法】\n!red 単語 → 赤陣営に言霊を捧げる\n!blue 単語 → 青陣営に言霊を捧げる'
    : '【詠唱メーカー参加方法】\n!word 単語 → 言霊を捧げる\n!vote 番号 → 単語に投票\n!odai テーマ → お題を提案';
  navigator.clipboard.writeText(text).then(() => {
    showToast('コマンドをコピーしました', 'success', 2000);
  }).catch(() => {
    showToast('コピーに失敗しました', 'error', 2000);
  });
}

async function saveCommandImage() {
  await document.fonts.ready;
  const isBattle = battleMode;
  const s = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const bgBase = s('--bg-base'), bgPanel = s('--bg-panel');
  const goldBright = s('--gold-bright'), fgDim = s('--fg-dim');
  const gR = s('--gold-r'), gG = s('--gold-g'), gB = s('--gold-b');

  const commands = isBattle ? [
    { cmd: '!red 単語', desc: '赤陣営に言霊を捧げる' },
    { cmd: '!blue 単語', desc: '青陣営に言霊を捧げる' },
  ] : [
    { cmd: '!word 単語', desc: '言霊を捧げる' },
    { cmd: '!vote 番号', desc: '単語に投票する' },
    { cmd: '!odai テーマ', desc: 'お題を提案する' },
  ];
  const title = isBattle ? '詠唱バトル 参加方法' : '詠唱メーカー 参加方法';

  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-9999px;width:400px;height:600px;background:${bgBase};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;box-sizing:border-box;font-family:'Zen Kaku Gothic New',sans-serif;`;

  const corner = (t,r,b,l) => `position:absolute;${t};${r};${b};${l};width:20px;height:20px;border-${t.split(':')[0]}:2px solid ${goldBright};border-${l?'left':'right'}:2px solid ${goldBright};`;
  el.innerHTML = `
    <div style="width:100%;height:100%;border:1px solid rgba(${gR},${gG},${gB},0.6);background:${bgPanel};padding:32px;box-sizing:border-box;display:flex;flex-direction:column;position:relative;">
      <div style="position:absolute;top:-1px;left:-1px;width:20px;height:20px;border-top:2px solid ${goldBright};border-left:2px solid ${goldBright};"></div>
      <div style="position:absolute;top:-1px;right:-1px;width:20px;height:20px;border-top:2px solid ${goldBright};border-right:2px solid ${goldBright};"></div>
      <div style="position:absolute;bottom:-1px;left:-1px;width:20px;height:20px;border-bottom:2px solid ${goldBright};border-left:2px solid ${goldBright};"></div>
      <div style="position:absolute;bottom:-1px;right:-1px;width:20px;height:20px;border-bottom:2px solid ${goldBright};border-right:2px solid ${goldBright};"></div>
      <div style="text-align:center;font-family:'Yuji Syuku',serif;font-size:16px;color:${goldBright};letter-spacing:0.15em;white-space:nowrap;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid rgba(${gR},${gG},${gB},0.3);">── ${esc(title)} ──</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:28px;">
        ${commands.map(c => `
          <div style="text-align:center;">
            <div style="font-family:'Shippori Mincho B1',serif;font-size:22px;font-weight:700;color:${goldBright};letter-spacing:0.1em;margin-bottom:6px;">${esc(c.cmd)}</div>
            <div style="font-size:14px;color:${fgDim};letter-spacing:0.05em;">${esc(c.desc)}</div>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center;font-size:12px;color:rgba(${gR},${gG},${gB},0.4);margin-top:24px;padding-top:16px;border-top:1px solid rgba(${gR},${gG},${gB},0.2);letter-spacing:0.1em;">eishou-maker.vercel.app</div>
    </div>
  `;

  document.body.appendChild(el);
  const canvas = await html2canvas(el, { width: 400, height: 600, scale: 2, backgroundColor: bgBase, useCORS: true });
  document.body.removeChild(el);

  const link = document.createElement('a');
  link.download = isBattle ? `バトルコマンド_${Date.now()}.png` : `コマンド_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('コマンド画像を保存しました', 'success', 2000);
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 300);
  }, duration);
}

// ── 術者の書モーダル ──
function openAuthorModal() {
  document.getElementById('authorModal').classList.add('visible');
}
function closeAuthorModal() {
  document.getElementById('authorModal').classList.remove('visible');
}

function openSettingsModal() {
  // 連続詠唱ボタンの状態を同期
  const chainBtn = document.getElementById('settingsChainBtn');
  if (chainBtn) {
    chainBtn.textContent = chainChantEnabled ? 'ON' : 'OFF';
    chainBtn.classList.toggle('active', chainChantEnabled);
  }
  document.getElementById('settingsModal').classList.add('visible');
  loadVoices();
}
function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('visible');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAuthorModal();
    closeSettingsModal();
  }
});

function updateRemixBtn() {
  const btn = document.getElementById('remixBtn');
  if (authState.isSubscriber) {
    btn.disabled = false;
    btn.title = '詠唱リミックス';
    btn.onclick = toggleRemixMode;
  } else {
    btn.disabled = false;
    btn.title = 'サブスクライバー限定（クリックで特典を見る）';
    btn.onclick = openAuthorModal;
    if (remixMode) toggleRemixMode();
  }
}

// 認証後にバトルボタンを有効化
function updateBattleBtn() {
  const btn = document.getElementById('battleBtn');
  if (authState.isSubscriber) {
    btn.disabled = false;
    btn.title = '詠唱バトル';
    btn.onclick = toggleBattleMode;
  } else {
    btn.disabled = false;
    btn.title = 'サブスクライバー限定（クリックで特典を見る）';
    btn.onclick = openAuthorModal;
    if (battleMode) toggleBattleMode();
  }
}
