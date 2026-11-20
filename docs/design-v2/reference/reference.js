// Standalone concept: scripted samples only. Does not contact any backend.
const examples = {
  returns: ['What is your returns policy?', 'In this sample policy, you can return an unused item in its original packaging within 14 days of delivery.'],
  shipping: ['How long does shipping take?', 'In this sample policy, standard delivery takes 3–5 business days after dispatch.'],
  hours: ['What are your opening hours?', 'In this sample policy, the support team is available Monday to Friday, 9am–5pm.']
};
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  const example = examples[button.dataset.example];
  document.querySelectorAll('[data-example]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  document.querySelector('#sample-question').textContent = example[0];
  document.querySelector('#sample-answer').textContent = example[1];
}));

// Native named details provide exclusive chapters without asynchronous toggle races.

const canvas = document.querySelector('#signal-core');
const toggle = document.querySelector('#motion-toggle');
const poster = document.querySelector('#core-poster');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (canvas && toggle && poster) {
  let teardown = null;
  let generation = 0;
  const resetMotionControl = () => {
    teardown = null;
    toggle.textContent = 'Enable motion';
    toggle.setAttribute('aria-pressed', 'false');
  };
  // Lazy-load true WebGL only after an explicit request. The poster is the default.
  toggle.addEventListener('click', async () => {
    const attempt = ++generation;
    if (teardown) { teardown(); return; }
    if (reduced.matches) { toggle.textContent = 'Reduced motion enabled'; return; }
    toggle.disabled = true;
    try {
      const { mountCore } = await import('./signal-core.js');
      if (attempt !== generation || reduced.matches || document.hidden) return;
      teardown = mountCore(canvas, poster, { onDispose: resetMotionControl });
      toggle.textContent = 'Pause motion'; toggle.setAttribute('aria-pressed', 'true');
    } catch { toggle.textContent = 'Static artwork active'; }
    finally { toggle.disabled = false; }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { generation++; if (teardown) teardown(); }
  });
  window.addEventListener('pagehide', () => { generation++; if (teardown) teardown(); });
}

const form = document.querySelector('#reference-chat');
if (form) {
  const transcript = document.querySelector('#reference-transcript');
  const input = document.querySelector('#reference-question');
  function answer(question) {
    const key = /ship|deliver/i.test(question) ? 'shipping' : /hour|open/i.test(question) ? 'hours' : /return|refund/i.test(question) ? 'returns' : null;
    const turn = document.createElement('article'); turn.className = 'chat-turn';
    const title = document.createElement('span'); title.className = 'mono'; title.textContent = 'SCRIPTED EXAMPLE';
    const query = document.createElement('p'); query.textContent = question;
    const reply = document.createElement('p'); reply.textContent = key ? examples[key][1] : 'This design reference has three scripted examples: returns, shipping, and opening hours. It does not contact a model provider.';
    turn.append(title, query, reply); transcript.append(turn); input.value = '';
    turn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  form.addEventListener('submit', e => { e.preventDefault(); const value = input.value.trim(); if (value) answer(value); });
  document.querySelectorAll('.console-shell button, .console-shell textarea').forEach(control => { control.disabled = false; });
  document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.question; input.focus(); }));
  document.querySelector('#reference-reset').addEventListener('click', () => { transcript.querySelectorAll('.chat-turn').forEach(turn => turn.remove()); input.value = ''; input.focus(); });
}
