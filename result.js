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
