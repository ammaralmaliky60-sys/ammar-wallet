/* وين راحت؟ — ui.js: escaping, money formatting, sheets (dialogs), confirmations, toasts, downloads. */
(function (WR) {
  'use strict';
  const F = window.WRFormat;
  const $ = (sel, root = document) => root.querySelector(sel);

  WR.safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  WR.cur = () => F.currency(WR.app.state?.settings.currency || WR.app.pendingCurrency);
  WR.fmt = minor => F.formatAmount(minor, WR.cur().dec, WR.app.state?.settings.digits);
  /** Amount with its unit kept on one line. The sign follows the number in source order so it renders
   *  on the number's left in right-to-left text ("+150,000"). */
  WR.money = (minor, { sign = '' } = {}) => `<span class="money"><span class="num">${WR.fmt(Math.abs(minor))}</span>` +
    `${sign ? `<span class="sign">${sign}</span>` : minor < 0 ? '<span class="sign">−</span>' : ''} <small>${WR.safe(WR.cur().unit)}</small></span>`;
  WR.moneyText = minor => `${WR.fmt(minor)} ${WR.cur().unit}`;
  WR.parseAmount = (text, opts) => F.parseAmount(text, WR.cur().dec, opts);

  // ---- toast with an optional action (e.g. undo) ----
  let toastTimer;
  WR.toast = (message, { action, tone = 'ok' } = {}) => {
    const el = $('#toast');
    el.dataset.tone = tone;
    el.innerHTML = `<span>${WR.safe(message)}</span>${action ? `<button type="button" class="toast-action">${WR.safe(action.label)}</button>` : ''}`;
    el.classList.add('show');
    if (action) el.querySelector('.toast-action').onclick = () => { el.classList.remove('show'); action.run(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : 3500);
  };

  // ---- sheet: a modal dialog that slides up on phones ----
  /**
   * WR.sheet({title, subtitle, body, submitLabel, onSubmit(data, form, close), secondary, onOpen(root)})
   * onSubmit may throw; the message is shown inside the sheet and the sheet stays open.
   */
  WR.sheet = ({ title, subtitle = '', body, submitLabel = 'حفظ', onSubmit, secondary, onOpen, wide = false }) => {
    const dialog = $('#sheet');
    dialog.classList.toggle('wide', wide);
    dialog.innerHTML = `<form class="sheet" method="dialog" novalidate>
      <header class="sheet-head"><div><h2>${WR.safe(title)}</h2>${subtitle ? `<p>${WR.safe(subtitle)}</p>` : ''}</div>
      <button type="button" class="icon-btn" data-close aria-label="إغلاق">${WR.icon('close')}</button></header>
      <div class="sheet-body">${body}<p class="form-error" role="alert" hidden></p></div>
      ${onSubmit || secondary ? `<footer class="sheet-foot">${secondary ? `<button type="button" class="btn ${secondary.danger ? 'danger' : 'ghost'}" data-secondary>${WR.safe(secondary.label)}</button>` : ''}
      ${onSubmit ? `<button type="submit" class="btn primary">${WR.safe(submitLabel)}</button>` : ''}</footer>` : ''}</form>`;
    const form = dialog.querySelector('form'), error = form.querySelector('.form-error');
    const close = () => { if (dialog.open) dialog.close(); };
    const showError = message => { error.textContent = message; error.hidden = false; };
    form.querySelector('[data-close]').onclick = close;
    form.onsubmit = e => {
      e.preventDefault();
      if (!onSubmit) return;
      error.hidden = true;
      try { onSubmit(Object.fromEntries(new FormData(form)), form, close); }
      catch (ex) { showError(ex.message); }
    };
    if (secondary) form.querySelector('[data-secondary]').onclick = () => { try { secondary.run(close); } catch (ex) { showError(ex.message); } };
    WR.wireAmounts(form);
    if (!dialog.open) dialog.showModal();
    onOpen?.(form, { close, showError });
    return { close, form, showError };
  };
  WR.closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };

  WR.confirm = ({ title, text, confirmLabel = 'تأكيد', danger = false }) => new Promise(resolve => {
    let answered = false;
    WR.sheet({ title, body: `<p class="lead">${WR.safe(text)}</p>`, submitLabel: confirmLabel,
      onSubmit: (_, __, close) => { answered = true; close(); resolve(true); } });
    const dialog = $('#sheet');
    if (danger) dialog.querySelector('button[type=submit]').classList.replace('primary', 'danger');
    dialog.addEventListener('close', () => { if (!answered) resolve(false); }, { once: true });
  });

  // ---- amount inputs: group digits while typing, accept Arabic digits ----
  function groupTyping(value) {
    const latin = F.latinDigits(value).replace(/[^\d.]/g, '');
    const [whole, ...rest] = latin.split('.');
    const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return rest.length ? `${grouped}.${rest.join('').slice(0, WR.cur().dec)}` : grouped;
  }
  WR.wireAmounts = root => root.querySelectorAll('input[data-amount]').forEach(input => {
    if (input.dataset.wired) return;
    input.dataset.wired = '1';
    input.addEventListener('input', () => {
      const before = input.value, caret = input.selectionStart ?? before.length;
      const digitsBefore = before.slice(0, caret).replace(/[^\d٠-٩.]/g, '').length;
      input.value = groupTyping(before);
      let seen = 0, pos = 0;
      while (pos < input.value.length && seen < digitsBefore) { if (/[\d.]/.test(input.value[pos])) seen++; pos++; }
      try { input.setSelectionRange(pos, pos); } catch { /* some input types do not support selection */ }
    });
  });

  WR.download = (filename, text, type = 'application/json') => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Reusable form controls. */
  WR.field = ({ label, name, value = '', type = 'text', attrs = '', hint = '' }) =>
    `<label class="field"><span>${WR.safe(label)}</span><input name="${name}" type="${type}" value="${WR.safe(value)}" ${attrs}>${hint ? `<small>${WR.safe(hint)}</small>` : ''}</label>`;
  WR.amountField = ({ label = 'المبلغ', name = 'amount', value = '', attrs = 'required', big = false }) =>
    `<label class="field ${big ? 'field-amount' : ''}"><span>${WR.safe(label)}</span><span class="amount-box"><input name="${name}" data-amount inputmode="decimal" autocomplete="off" value="${WR.safe(value)}" ${attrs} placeholder="0"><small>${WR.safe(WR.cur().unit)}</small></span></label>`;
  /** A row of radio "chips" (accessible: real radio inputs). options: [{value,label,icon?,color?,sub?}] */
  WR.chips = ({ name, options, value, label, cls = '' }) => `<fieldset class="chips ${cls}"><legend>${WR.safe(label)}</legend>` +
    options.map(o => `<label class="chip"${o.color ? ` style="--c:${o.color}"` : ''}><input type="radio" name="${name}" value="${WR.safe(o.value)}" ${o.value === value ? 'checked' : ''}>` +
      `<span>${o.icon ? WR.icon(o.icon) : ''}<b>${WR.safe(o.label)}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span></label>`).join('') + '</fieldset>';
})(window.WR = window.WR || {});
