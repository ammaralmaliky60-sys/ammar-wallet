/* وين راحت؟ — settings.js: preferences, accounts, income sources, appearance and data. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const acctIcon = a => a.id === 'card' ? 'card' : a.id === 'cash' ? 'cash' : 'wallet';

  const releases = [
    ['v0.012', '2026-11-23', 'رقم النسخة', 'إظهار رقم النسخة في الواجهة بصيغة v0.012.'],
    ['3.2.5', '2026-11-23', 'سجل التحديثات', 'عرض عدد التحديثات الأخيرة وتواريخها وتفاصيلها من الرئيسية والإعدادات.'],
    ['3.2.4', '2026-11-23', 'ربط الدخل القديم والجديد', 'الدخل الإضافي في الرئيسية مع مجموع الشهر وكل الأشهر، وربط الملاحظات الواضحة بالمصدر وإمكانية تعديل مصدر الحركة.'],
    ['3.2.3', '2026-11-23', 'مساهمة الزوجة وتقرير PDF', 'تسجيل مساهمة الزوجة وجمع مبالغها حسب الشهر، وترتيب تقرير PDF وتقليل الصفحات الفارغة.'],
    ['3.2.2', '2026-11-23', 'فلوسي وتبسيط المبالغ المعزولة', 'رصيد موحّد مع إجراءات اعزل ورجّع وسدّد، وإمكانية إظهار النقد والبطاقة من الإعدادات.'],
    ['3.2.0', '2026-11-21', 'تحديث الواجهة والميزانيات', 'تصميم حديث وانتقالات ووضع فاتح وداكن وتلقائي، وميزانيات مفتوحة ومبالغ معزولة قابلة للإضافة والسحب والتسديد.']
  ];
  WR.releaseSummary = () => `<section class="card"><header class="card-head"><h2>نسخة التطبيق <b dir="ltr">${releases[0][0]}</b></h2>
    <button type="button" class="btn small ghost" data-action="release-history" aria-haspopup="dialog">سجل التحديثات</button></header></section>`;
  function releaseHistory() {
    WR.sheet({ title: 'سجل التحديثات', subtitle: 'النسخة الحالية ' + releases[0][0],
      body: releases.map(([version, date, title, description]) => `<section class="note">
          <h3>${WR.safe(title)}</h3><p><b dir="ltr">${version}</b> · <time datetime="${date}">${WR.safe(F.dateLabel(date, { long: true, digits: WR.app.state.settings.digits }))}</time></p>
          <p>${WR.safe(description)}</p></section>`).join('') +
        '<p><a class="link" href="https://github.com/ammaralmaliky60-sys/ammar-wallet/commits/main/" target="_blank" rel="noopener noreferrer">سجل المشروع الكامل على GitHub</a></p>'
    });
  }
  WR.actions = Object.assign(WR.actions || {}, { 'release-history': releaseHistory });

  function render(app) {
    const s = app.state, set = s.settings, b = L.balances(s), hasTx = s.transactions.length > 0;
    const theme = WR.store.theme() || 'auto', legacy = WR.store.legacyRaw(), unified = L.unifiedWallet(s);
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
          <label class="field"><span>طريقة عرض الرصيد</span><select name="accountMode">
            <option value="unified" ${unified ? 'selected' : ''}>فلوسي · رصيد واحد</option>
            <option value="split" ${!unified ? 'selected' : ''}>فصل النقد والبطاقة</option>
          </select></label>
          <button type="submit" class="btn primary">حفظ</button>
        </form></section>

      <section class="card"><header class="card-head"><h2>الحسابات</h2></header>
        ${unified ? '<details class="optional-field"><summary>إدارة الحسابات وطرق الدفع</summary>' :
          '<p class="muted">الحركات بدون طريقة دفع تظهر في حساب «فلوسي».</p>'}
        <div class="btn-row"><button type="button" class="btn small ghost" data-action="edit-account">${WR.icon('plus')}حساب</button></div>
        <div class="list">${s.accounts.filter(a => !a.archived).map(a => `<button type="button" class="list-row" data-action="${a.reserveTarget === undefined ? 'edit-account' : 'edit-reserve'}" data-id="${WR.safe(a.id)}">
          <span class="tx-ic" style="--c:var(--brand-green)">${WR.icon(acctIcon(a))}</span><span class="tx-text"><b>${WR.safe(a.name)}</b><small>${a.reserveTarget === undefined ? 'رصيد البداية ' + WR.safe(WR.moneyText(a.opening)) : 'مبلغ معزول'}</small></span>
          <span class="tx-amount ${b.accounts[a.id] < 0 ? 'neg' : ''}">${WR.money(b.accounts[a.id])}</span></button>`).join('')}</div>
        ${unified ? '</details>' : ''}</section>

      <section class="card"><header class="card-head"><h2>مصادر الدخل</h2><button type="button" class="btn small ghost" data-action="edit-source">${WR.icon('plus')}مصدر</button></header>
        <p class="muted">تابع الدخل حسب المصدر. للمصادر المنتظمة تقدر تضيف يوم تذكير.</p>
        <div class="list">${s.incomeSources.filter(x => !x.archived).map(x => `<button type="button" class="list-row" data-action="edit-source" data-id="${WR.safe(x.id)}">
          <span class="tx-ic" style="--c:var(--brand-gold)">${WR.icon('income')}</span><span class="tx-text"><b>${WR.safe(x.name)}</b><small>${x.day === null ? 'بدون موعد ثابت' : 'يوم ' + x.day + ' من كل شهر'}${unified ? '' : ' · ' + WR.safe(WR.account(x.accountId).name)}</small></span>
          <span class="tx-amount">${x.amount ? WR.money(x.amount) : '<small class="muted">بدون مبلغ متوقع</small>'}</span></button>`).join('') || '<p class="muted">لا توجد مصادر دخل بعد.</p>'}</div></section>

      <section class="card"><header class="card-head"><h2>الفئات</h2><a class="link" href="#budget">إدارتها من الميزانية</a></header>
        <p class="muted">${s.categories.filter(c => !c.archived).length} فئة نشطة. أضف فئة أو عدّل اسمها وسقفها من صفحة الميزانية.</p></section>

      <section class="card"><header class="card-head"><h2>المظهر</h2></header>
        <div class="seg appearance-options" role="group" aria-label="المظهر">${[['auto', 'phone', 'حسب الجهاز'], ['classic', 'sun', 'فاتح'], ['night', 'moon', 'داكن']].map(([v, icon, label]) =>
          `<button type="button" data-action="set-theme" data-id="${v}" aria-pressed="${theme === v}">${WR.icon(icon)}${label}</button>`).join('')}</div></section>

      <section class="card"><header class="card-head"><h2>بياناتك</h2></header>
        <p class="muted">نزّل نسخة احتياطية كل أسبوع واحفظها خارج الجوال. الاستعادة تستبدل كل البيانات الحالية.</p>
        <div class="btn-row"><button type="button" class="btn primary" data-action="backup">${WR.icon('download')}نسخة احتياطية</button>
          <button type="button" class="btn ghost" data-action="restore">${WR.icon('upload')}استعادة نسخة</button></div>
        ${legacy ? `<div class="note"><b>بيانات الإصدار السابق</b><p>محفوظة كما هي على هذا الجهاز${s.meta.migratedFrom ? '، ونُقلت منها حركاتك' : ''}. يمكنك تنزيلها للاحتفاظ بها.</p>
          <button type="button" class="btn small ghost" data-action="legacy-download">${WR.icon('download')}تنزيل بيانات الإصدار السابق</button></div>` : ''}
        <div class="danger-zone"><button type="button" class="btn danger" data-action="wipe">${WR.icon('trash')}حذف كل البيانات والبدء من جديد</button></div>
      </section>${WR.releaseSummary()}</div>`;
  }

  function bind(root) {
    root.querySelector('#generalForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)), s = WR.app.state;
      const next = L.updateSettings(s, { name: (f.name || '').trim(), monthStartDay: Number(f.monthStartDay), digits: f.digits, currency: f.currency || s.settings.currency, accountMode: f.accountMode });
      if (next.settings.monthStartDay !== s.settings.monthStartDay) WR.app.monthKey = null;
      WR.app.commit(next, 'تم حفظ الإعدادات');
    };
  }

  function editAccount(id) {
    const s = WR.app.state, a = id ? s.accounts.find(x => x.id === id) : { name: '', opening: 0 };
    if (!a || a.reserveTarget !== undefined) return;
    const used = id && (s.transactions.some(t => t.accountId === id || t.toAccountId === id));
    WR.sheet({
      title: id ? `حساب «${a.name}»` : 'حساب جديد', subtitle: 'رصيد البداية هو المبلغ الموجود فعلاً في هذا الحساب قبل أول حركة سجلتها.',
      body: (a.pooled ? '' : WR.field({ label: 'اسم الحساب', name: 'name', value: a.name, attrs: 'required maxlength="40" placeholder="مثلاً: زين كاش"' })) +
        WR.amountField({ label: 'رصيد البداية', name: 'opening', value: a.opening > 0 ? F.amountInputValue(a.opening, WR.cur().dec) : '', attrs: '' }),
      secondary: id && !a.pooled ? { label: used ? 'أرشفة الحساب' : 'حذف الحساب', danger: true, run: close => {
        if (s.accounts.filter(x => !x.archived && x.reserveTarget === undefined).length <= 1) throw new Error('يجب أن يبقى حساب عادي واحد على الأقل.');
        close(); WR.app.commit(L.removeAccount(s, id), used ? 'أُرشف الحساب وتبقى حركاته في السجل' : 'حُذف الحساب');
      } } : null,
      onSubmit: (d, form, close) => {
        const name = a.pooled ? a.name : (d.name || '').trim();
        if (!name) throw new Error('اكتب اسم الحساب.');
        const opening = d.opening ? WR.parseAmount(d.opening, { allowZero: true }) : 0;
        close(); WR.app.commit(L.saveAccount(s, id ? { id, name, opening } : { name, opening, archived: false }), id ? 'تم حفظ الحساب' : `أُضيف حساب «${name}»`);
      }
    });
  }

  function editSource(id) {
    const s = WR.app.state, unified = L.unifiedWallet(s);
    const accounts = s.accounts.filter(a => !a.archived && a.reserveTarget === undefined);
    const x = id ? s.incomeSources.find(v => v.id === id) : { name: '', day: null, amount: 0, accountId: unified ? '' : accounts[0].id };
    if (!x) return;
    WR.sheet({
      title: id ? `«${x.name}»` : 'مصدر دخل جديد', subtitle: 'اترك اليوم فارغاً إذا كان الدخل يوصلك بدون موعد ثابت.',
      body: WR.field({ label: 'الاسم', name: 'name', value: x.name, attrs: 'required maxlength="40" placeholder="مثلاً: الراتب"' }) +
        WR.field({ label: 'يوم الاستلام الشهري (اختياري)', name: 'day', type: 'number', value: x.day ?? '', attrs: 'min="1" max="31" inputmode="numeric"' }) +
        WR.amountField({ label: 'المبلغ المتوقع', name: 'amount', value: x.amount ? F.amountInputValue(x.amount, WR.cur().dec) : '', attrs: '' }) +
        (unified ? '' : WR.chips({ name: 'accountId', value: x.accountId, label: 'يصل إلى حساب', cls: 'chips-row',
          options: s.accounts.filter(a => accounts.includes(a) || a.id === x.accountId).map(a => ({ value: a.id, label: a.name, icon: acctIcon(a) })) })),
      secondary: id ? { label: 'حذف المصدر', danger: true, run: close => { close(); WR.app.commit(L.removeIncomeSource(s, id), 'حُذف مصدر الدخل'); } } : null,
      onSubmit: (d, form, close) => {
        const name = (d.name || '').trim(), day = d.day === '' ? null : Number(d.day);
        if (!name) throw new Error('اكتب اسم مصدر الدخل.');
        if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error('يوم الاستلام بين 1 و31.');
        const amount = d.amount ? WR.parseAmount(d.amount, { allowZero: true }) : 0;
        let current = WR.app.state, accountId = unified ? x.accountId : d.accountId;
        if (!accountId && unified) ({ state: current, accountId } = L.ensureWallet(current));
        const item = { name, day, amount, accountId };
        WR.app.commit(L.saveIncomeSource(current, id ? { id, ...item } : item), id ? 'تم حفظ مصدر الدخل' : `أُضيف «${name}»`);
        close();
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
    'set-theme': d => { WR.store.setTheme(d.id === 'auto' ? null : d.id); WR.applyTheme(); },
    backup: () => { WR.download(`ween-rahat-backup-${F.today()}.json`, WR.store.backupText(WR.app.state)); WR.toast('تم تنزيل النسخة الاحتياطية. احفظها في مكان آمن.'); },
    restore, wipe,
    'legacy-download': () => { const raw = WR.store.legacyRaw(); if (raw) WR.download(`ween-rahat-previous-version-${F.today()}.json`, raw); }
  });
})(window.WR = window.WR || {});
