/* وين راحت؟ — onboarding.js: first start (one short page) and recovery when stored data cannot be read. */
(function (WR) {
  'use strict';
  const L = window.WRLedger, F = window.WRFormat;
  const $ = s => document.querySelector(s);

  function frame(html) {
    document.body.dataset.page = 'welcome';
    $('#sideNav').innerHTML = ''; $('#tabbar').innerHTML = '';
    $('#pageTitle').textContent = 'أهلاً بك';
    $('#main').innerHTML = html;
  }

  function show() {
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    frame(`<section class="welcome card">
      <div class="welcome-head">${WR.MARK}<div><h1>وين راحت<span class="brand-q">؟</span></h1><p>اعرف فلوسك وين تروح: سجّل مصروفك بثوانٍ، وشوف وين يروح كل دينار، وخطط شهرك.</p></div></div>
      <form id="welcomeForm" class="form-stack" novalidate>
        <h2>1. عنك</h2>
        ${WR.field({ label: 'اسمك (اختياري)', name: 'name', attrs: 'maxlength="40" placeholder="مثلاً: عمار"' })}
        <div class="form-row">
          <label class="field"><span>العملة</span><select name="currency">${Object.entries(F.CURRENCIES).map(([k, c]) => `<option value="${k}">${c.label} (${c.unit})</option>`).join('')}</select></label>
          <label class="field"><span>يبدأ شهرك المالي يوم</span><select name="monthStartDay">${days.map(d => `<option value="${d}">${d === 1 ? '1 (الشهر الميلادي)' : d}</option>`).join('')}</select></label>
        </div>
        <h2>2. فلوسك الموجودة الآن</h2>
        <p class="muted">المبلغ الموجود فعلاً اليوم. إذا ما تعرفه بالضبط اكتب تقديراً وتقدر تعدله لاحقاً.</p>
        <div class="form-row">${WR.amountField({ label: 'النقد في يدك', name: 'cash', attrs: '' })}${WR.amountField({ label: 'في البطاقة أو البنك', name: 'card', attrs: '' })}</div>
        <h2>3. راتبك (اختياري)</h2>
        <p class="muted">حتى يذكّرك البرنامج بموعده. تقدر تضيف الحوافز أو أي دخل آخر من الإعدادات.</p>
        <div class="form-row">${WR.field({ label: 'يوم وصول الراتب', name: 'salaryDay', type: 'number', attrs: 'min="1" max="31" inputmode="numeric" placeholder="مثلاً: 23"' })}
          ${WR.amountField({ label: 'مبلغ الراتب التقريبي', name: 'salary', attrs: '' })}</div>
        <p class="form-error" role="alert" hidden></p>
        <button type="submit" class="btn primary big">ابدأ</button>
        <button type="button" class="btn ghost" data-action="restore">${WR.icon('upload')}عندي نسخة احتياطية</button>
      </form></section>`);
    WR.applyTheme();
    const form = $('#welcomeForm'), error = form.querySelector('.form-error');
    WR.wireAmounts(form);
    form.querySelector('select[name=currency]').onchange = e => {
      // Amount fields show the chosen currency's unit (no state exists yet).
      WR.app.pendingCurrency = e.target.value;
      form.querySelectorAll('.amount-box small').forEach(el => { el.textContent = F.currency(e.target.value).unit; });
    };
    form.onsubmit = e => {
      e.preventDefault(); error.hidden = true;
      try {
        const d = Object.fromEntries(new FormData(form)), cur = F.currency(d.currency);
        const amount = v => v ? F.parseAmount(v, cur.dec, { allowZero: true }) : 0;
        let s = L.createState({ name: (d.name || '').trim(), currency: d.currency, monthStartDay: Number(d.monthStartDay) });
        s = L.saveAccount(s, { id: 'cash', opening: amount(d.cash) });
        s = L.saveAccount(s, { id: 'card', opening: amount(d.card) });
        if (d.salaryDay || d.salary) {
          const day = Number(d.salaryDay) || 1;
          if (day < 1 || day > 31) throw new Error('يوم الراتب بين 1 و31.');
          s = L.saveIncomeSource(s, { id: 'salary', name: 'الراتب', day, amount: amount(d.salary), accountId: 'card', archived: false });
        }
        WR.store.save(s);
        WR.app.state = s; WR.app.monthKey = null;
        location.hash = 'home'; WR.render();
        WR.toast('جاهز! سجّل أول مصروف من زر «سجّل».');
      } catch (ex) { error.textContent = ex.message; error.hidden = false; }
    };
  }

  function recovery(result) {
    frame(`<section class="welcome card">
      <div class="welcome-head">${WR.MARK}<div><h1>تعذر فتح بياناتك</h1><p>${WR.safe(result.error || '')}</p></div></div>
      <p>لم يُحذف أي شيء. نزّل البيانات كما هي أولاً، ثم استعد نسخة احتياطية أو ابدأ من جديد.</p>
      <div class="btn-row">
        ${result.raw ? `<button type="button" class="btn primary" data-action="download-raw">${WR.icon('download')}تنزيل البيانات المحفوظة</button>` : ''}
        ${WR.store.legacyRaw() ? `<button type="button" class="btn primary" data-action="legacy-download">${WR.icon('download')}تنزيل بيانات الإصدار السابق</button>` : ''}
        <button type="button" class="btn ghost" data-action="restore">${WR.icon('upload')}استعادة نسخة احتياطية</button>
        <button type="button" class="btn danger" data-action="start-fresh">ابدأ من جديد</button></div></section>`);
    WR.actions['download-raw'] = () => WR.download(`ween-rahat-unreadable-${F.today()}.json`, result.raw);
  }

  WR.views = WR.views || {};
  WR.views.onboarding = { show, recovery };
  WR.actions = Object.assign(WR.actions || {}, {
    'start-fresh': async () => {
      const ok = await WR.confirm({ title: 'البدء من جديد؟', text: 'ستبدأ بيانات جديدة فارغة. البيانات القديمة لا تُحذف من الجهاز.', confirmLabel: 'ابدأ من جديد' });
      if (ok) { WR.store.clear(); show(); }
    }
  });
})(window.WR = window.WR || {});
