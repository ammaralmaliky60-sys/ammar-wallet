/* وين راحت؟ — settings.js: preferences, accounts, income sources, appearance and data. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const acctIcon = a => a.id === 'card' ? 'card' : a.id === 'cash' ? 'cash' : 'wallet';

  function render(app) {
    const s = app.state, set = s.settings, b = L.balances(s), hasTx = s.transactions.length > 0;
    const theme = WR.store.theme() || 'auto', legacy = WR.store.legacyRaw();
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    return WR.pageHead('الإعدادات', 'بياناتك محفوظة على هذا الجهاز فقط، ولا تُرسل لأي خادم.') + `<div class="settings-grid">
      <section class="card"><header class="card-head"><h2>عام</h2></header>
        <form id="generalForm" class="form-stack">
          ${WR.field({ label: 'اسمك (يظهر في التحية)', name: 'name', value: set.name, attrs: 'maxlength="40" placeholder="اختياري"' })}
          <label class="field"><span>يوم بداية الشهر المالي</span><select name="monthStartDay">${days.map(d => `<option value="${d}" ${d === set.monthStartDay ? 'selected' : ''}>${d === 1 ? '1 (الشهر الميلادي)' : d}</option>`).join('')}</select>
            <small>اختر يوم استلام الراتب حتى يبدأ شهرك معه. التقارير والميزانية تتبع هذا اليوم.</small></label>
          <label class="field"><span>العملة</span><select name="currency" ${hasTx ? 'disabled' : ''}>${Object.entries(F.CURRENCIES).map(([k, c]) => `<option value="${k}" ${k === set.currency ? 'selected' : ''}>${c.label} (${c.unit})</option>`).join('')}</select>
            ${hasTx ? '<small>لا تتغير العملة بعد تسجيل حركات، حتى لا تختلط المبالغ.</small>' : ''}</label>
          <label class="field"><span>شكل الأرقام</span><select name="digits"><option value="en" ${set.digits === 'en' ? 'selected' : ''}>123,456</option><option value="ar" ${set.digits === 'ar' ? 'selected' : ''}>١٢٣٬٤٥٦</option></select></label>
          <button type="submit" class="btn primary">حفظ</button>
        </form></section>

      <section class="card"><header class="card-head"><h2>الحسابات</h2><button type="button" class="btn small ghost" data-action="edit-account">${WR.icon('plus')}حساب</button></header>
        <p class="muted">أماكن المال: النقد في يدك، البطاقة أو الحساب البنكي، أو أي محفظة إلكترونية.</p>
        <div class="list">${s.accounts.filter(a => !a.archived).map(a => `<button type="button" class="list-row" data-action="edit-account" data-id="${WR.safe(a.id)}">
          <span class="tx-ic" style="--c:var(--brand-green)">${WR.icon(acctIcon(a))}</span><span class="tx-text"><b>${WR.safe(a.name)}</b><small>رصيد البداية ${WR.safe(WR.moneyText(a.opening))}</small></span>
          <span class="tx-amount ${b.accounts[a.id] < 0 ? 'neg' : ''}">${WR.money(b.accounts[a.id])}</span></button>`).join('')}</div></section>

      <section class="card"><header class="card-head"><h2>مصادر الدخل</h2><button type="button" class="btn small ghost" data-action="edit-source">${WR.icon('plus')}مصدر</button></header>
        <p class="muted">الراتب والحوافز وأي دخل منتظم: يذكّرك البرنامج في موعده حتى تسجّل استلامه.</p>
        <div class="list">${s.incomeSources.filter(x => !x.archived).map(x => `<button type="button" class="list-row" data-action="edit-source" data-id="${WR.safe(x.id)}">
          <span class="tx-ic" style="--c:var(--brand-gold)">${WR.icon('income')}</span><span class="tx-text"><b>${WR.safe(x.name)}</b><small>يوم ${x.day} من كل شهر · ${WR.safe(WR.account(x.accountId).name)}</small></span>
          <span class="tx-amount">${x.amount ? WR.money(x.amount) : '<small class="muted">بدون مبلغ متوقع</small>'}</span></button>`).join('') || '<p class="muted">لا توجد مصادر دخل بعد.</p>'}</div></section>

      <section class="card"><header class="card-head"><h2>الفئات</h2><a class="link" href="#budget">إدارتها من الميزانية</a></header>
        <p class="muted">${s.categories.filter(c => !c.archived).length} فئة نشطة. أضف فئة أو عدّل اسمها وسقفها من صفحة الميزانية.</p></section>

      <section class="card"><header class="card-head"><h2>المظهر</h2></header>
        <div class="seg" role="group" aria-label="المظهر">${[['auto', 'حسب الجهاز'], ['classic', 'فاتح'], ['night', 'داكن']].map(([v, l]) =>
          `<button type="button" data-action="set-theme" data-id="${v}" aria-pressed="${theme === v}">${l}</button>`).join('')}</div></section>

      <section class="card"><header class="card-head"><h2>بياناتك</h2></header>
        <p class="muted">نزّل نسخة احتياطية كل أسبوع واحفظها خارج الجوال. الاستعادة تستبدل كل البيانات الحالية.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-action="backup">${WR.icon('download')}نسخة احتياطية</button>
          <button type="button" class="btn ghost" data-action="restore">${WR.icon('upload')}استعادة نسخة</button></div>
        ${legacy ? `<div class="note"><b>بيانات الإصدار السابق</b><p>محفوظة كما هي على هذا الجهاز${s.meta.migratedFrom ? '، ونُقلت منها حركاتك' : ''}. يمكنك تنزيلها للاحتفاظ بها.</p>
          <button type="button" class="btn small ghost" data-action="legacy-download">${WR.icon('download')}تنزيل بيانات الإصدار السابق</button></div>` : ''}
        <p class="muted"><a class="link" href="./privacy.html">سياسة الخصوصية</a> — اطّلع على كيفية حفظ بياناتك وحذفها.</p>
        <div class="danger-zone"><button type="button" class="btn danger" data-action="wipe">${WR.icon('trash')}حذف كل البيانات والبدء من جديد</button></div>
      </section></div>`;
  }

  function bind(root) {
    root.querySelector('#generalForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)), s = WR.app.state;
      const next = L.updateSettings(s, { name: (f.name || '').trim(), monthStartDay: Number(f.monthStartDay), digits: f.digits, currency: f.currency || s.settings.currency });
      if (next.settings.monthStartDay !== s.settings.monthStartDay) WR.app.monthKey = null;
      WR.app.commit(next, 'تم حفظ الإعدادات');
    };
  }

  function editAccount(id) {
    const s = WR.app.state, a = id ? s.accounts.find(x => x.id === id) : { name: '', opening: 0 };
    const used = id && (s.transactions.some(t => t.accountId === id || t.toAccountId === id));
    WR.sheet({
      title: id ? `حساب «${a.name}»` : 'حساب جديد', subtitle: 'رصيد البداية هو المبلغ الموجود فعلاً في هذا الحساب قبل أول حركة سجلتها.',
      body: WR.field({ label: 'اسم الحساب', name: 'name', value: a.name, attrs: 'required maxlength="40" placeholder="مثلاً: زين كاش"' }) +
        WR.amountField({ label: 'رصيد البداية', name: 'opening', value: a.opening > 0 ? F.amountInputValue(a.opening, WR.cur().dec) : '', attrs: '' }),
      secondary: id ? { label: used ? 'أرشفة الحساب' : 'حذف الحساب', danger: true, run: close => {
        if (s.accounts.filter(x => !x.archived).length <= 1) throw new Error('يجب أن يبقى حساب واحد على الأقل.');
        close(); WR.app.commit(L.removeAccount(s, id), used ? 'أُرشف الحساب وتبقى حركاته في السجل' : 'حُذف الحساب');
      } } : null,
      onSubmit: (d, form, close) => {
        const name = (d.name || '').trim(); if (!name) throw new Error('اكتب اسم الحساب.');
        const opening = d.opening ? WR.parseAmount(d.opening, { allowZero: true }) : 0;
        close(); WR.app.commit(L.saveAccount(s, id ? { id, name, opening } : { name, opening, archived: false }), id ? 'تم حفظ الحساب' : `أُضيف حساب «${name}»`);
      }
    });
  }

  function editSource(id) {
    const s = WR.app.state, x = id ? s.incomeSources.find(v => v.id === id) : { name: '', day: 1, amount: 0, accountId: s.accounts.find(a => !a.archived).id };
    WR.sheet({
      title: id ? `«${x.name}»` : 'مصدر دخل جديد', subtitle: 'المبلغ المتوقع اختياري، ويُقترح تلقائياً عند تسجيل الاستلام.',
      body: WR.field({ label: 'الاسم', name: 'name', value: x.name, attrs: 'required maxlength="40" placeholder="مثلاً: الراتب"' }) +
        WR.field({ label: 'يوم الاستلام المتوقع من كل شهر', name: 'day', type: 'number', value: x.day, attrs: 'min="1" max="31" required inputmode="numeric"' }) +
        WR.amountField({ label: 'المبلغ المتوقع', name: 'amount', value: x.amount ? F.amountInputValue(x.amount, WR.cur().dec) : '', attrs: '' }) +
        WR.chips({ name: 'accountId', value: x.accountId, label: 'يصل إلى حساب', cls: 'chips-row', options: s.accounts.filter(a => !a.archived).map(a => ({ value: a.id, label: a.name, icon: acctIcon(a) })) }),
      secondary: id ? { label: 'حذف المصدر', danger: true, run: close => { close(); WR.app.commit(L.removeIncomeSource(s, id), 'حُذف مصدر الدخل'); } } : null,
      onSubmit: (d, form, close) => {
        const name = (d.name || '').trim(), day = Number(d.day);
        if (!name) throw new Error('اكتب اسم مصدر الدخل.');
        if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('يوم الاستلام بين 1 و31.');
        const amount = d.amount ? WR.parseAmount(d.amount, { allowZero: true }) : 0;
        const item = { name, day, amount, accountId: d.accountId };
        close(); WR.app.commit(L.saveIncomeSource(s, id ? { id, ...item } : { ...item, archived: false }), id ? 'تم حفظ مصدر الدخل' : `أُضيف «${name}»`);
      }
    });
  }

  function migrationNotice(report) {
    const app = WR.app, b = report.balances;
    WR.sheet({
      title: 'أهلاً بك في «وين راحت؟» الجديد', wide: true,
      body: `<p class="lead">نقلنا بياناتك إلى طريقة العمل الجديدة: تسجّل مصروفك مباشرة من حسابك، والميزانية سقف لكل فئة للمقارنة فقط.</p>
        <ul class="facts"><li>${WR.icon('check')}<span><b>${report.transactions}</b> حركة، و<b>${report.categories}</b> فئة، و<b>${report.incomeSources}</b> مصدر دخل.</span></li>
        <li>${WR.icon('check')}<span>أرصدتك مطابقة للإصدار السابق: النقد ${WR.money(b.cash)} والبطاقة ${WR.money(b.card)}.</span></li>
        <li>${WR.icon('check')}<span>سدادات الالتزامات صارت مصروفات في فئة «التزامات وأقساط».</span></li>
        <li>${WR.icon('clock')}<span>خطوات التوزيع القديمة (التخصيص، الحجز، الإرجاع…) لم تُنقل لأنها لم تغيّر أرصدتك.</span></li>
        <li>${WR.icon('shield')}<span>بيانات الإصدار السابق باقية كما هي، ويمكنك تنزيلها من الإعدادات.</span></li></ul>
        <p class="muted">الشهر يبدأ الآن يوم 1. إذا كان راتبك يصل في يوم آخر، غيّر «يوم بداية الشهر المالي» من الإعدادات.</p>`,
      submitLabel: 'ابدأ', onSubmit: (_, __, close) => close(),
      secondary: { label: 'ضبط بداية الشهر', run: close => { close(); app.go('settings'); } }
    });
  }

  // ---- data actions ----
  function restore() {
    const input = document.querySelector('#restoreFile');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        if (file.size > 10_000_000) throw new Error('الملف أكبر من 10 ميغابايت.');
        const { state, migrated } = WR.store.parseBackup(await file.text());
        const ok = await WR.confirm({ title: 'استعادة النسخة؟', danger: true, confirmLabel: 'استبدال البيانات',
          text: `ستُستبدل بياناتك الحالية بالنسخة (${state.transactions.length} حركة${migrated ? '، من الإصدار السابق' : ''}). نزّل نسخة من بياناتك الحالية أولاً إذا كنت تحتاجها.` });
        if (!ok) return;
        WR.store.save(state); WR.app.state = state; WR.app.monthKey = null; WR.render(); WR.toast('تمت استعادة النسخة');
      } catch (e) { WR.toast(e.message, { tone: 'error' }); }
    };
    input.click();
  }
  async function wipe() {
    const ok = await WR.confirm({ title: 'حذف كل البيانات؟', danger: true, confirmLabel: 'حذف نهائي',
      text: 'ستُحذف كل حركاتك وحساباتك وفئاتك من هذا الجهاز ولا يمكن التراجع. بيانات الإصدار السابق (إن وجدت) لا تُحذف.' });
    if (!ok) return;
    WR.store.clear(); WR.app.state = null; location.hash = ''; WR.views.onboarding.show();
  }

  WR.views = WR.views || {};
  WR.views.settings = { render, bind, migrationNotice };
  WR.actions = Object.assign(WR.actions || {}, {
    'edit-account': d => editAccount(d.id), 'edit-source': d => editSource(d.id),
    'set-theme': d => { WR.store.setTheme(d.id === 'auto' ? null : d.id); WR.applyTheme(); WR.render(); },
    backup: () => {
      Promise.resolve(WR.download(`ween-rahat-backup-${F.today()}.json`, WR.store.backupText(WR.app.state)))
        .then(() => WR.toast(window.WRNative?.isNative ? 'فُتحت خيارات الحفظ أو المشاركة. تأكد من حفظ الملف خارج التطبيق.' : 'تم تنزيل النسخة الاحتياطية. احفظها في مكان آمن.'))
        .catch(e => WR.toast('تعذر حفظ النسخة: ' + e.message, { tone: 'error' }));
    },
    restore, wipe,
    'legacy-download': () => {
      const raw = WR.store.legacyRaw();
      if (raw) Promise.resolve(WR.download(`ween-rahat-previous-version-${F.today()}.json`, raw))
        .catch(e => WR.toast('تعذر حفظ بيانات الإصدار السابق: ' + e.message, { tone: 'error' }));
    }
  });
})(window.WR = window.WR || {});
