// ── ユーティリティ ──

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
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

function getThemeBgBase() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim();
}
function getThemeBgWindow() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg-window').trim();
}
function getThemeFgBase() {
  return getComputedStyle(document.documentElement).getPropertyValue('--fg-base').trim();
}
