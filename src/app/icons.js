/* وين راحت؟ — icons.js: inline stroke icons (24×24). */
(function (WR) {
  'use strict';
  const P = {
    home: 'M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6',
    list: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
    plus: 'M12 5v14 M5 12h14',
    pie: 'M12 3a9 9 0 1 0 9 9h-9z M14.5 3.3A9 9 0 0 1 20.7 9.5H14.5z',
    chart: 'M4 20V10 M10 20V4 M16 20v-7 M3 20h18',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2 M9 20h.01 M17 20h.01',
    coffee: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 10h1.5a2.5 2.5 0 0 1 0 5H17 M8 3v3 M12 3v3',
    car: 'M5 16h14 M6.5 16l1.4-5.3A2 2 0 0 1 9.8 9h4.4a2 2 0 0 1 1.9 1.7L17.5 16 M4 16v3h2v-3 M18 16v3h2v-3 M7.5 13.5h.01 M16.5 13.5h.01',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    kids: 'M9 7a3 3 0 1 0 0-.01 M17 9a2.5 2.5 0 1 0 0-.01 M3 20v-1a6 6 0 0 1 12 0v1 M15 20v-1a4 4 0 0 1 6-3.5',
    health: 'M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z M12 10v5 M9.5 12.5h5',
    shirt: 'M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-1 1.5-2.4 2.2-4 2.2S9 4.5 8 3z',
    spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M6 18l2.5-2.5 M15.5 8.5 18 6',
    gift: 'M4 11h16v10H4z M3 7h18v4H3z M12 7v14 M12 7S10.5 3 8 3a2 2 0 0 0 0 4z M12 7s1.5-4 4-4a2 2 0 0 1 0 4z',
    dots: 'M5 12h.01 M12 12h.01 M19 12h.01',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h3',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
    shield: 'M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z',
    book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z M4 19V5 M8 7h8',
    phone: 'M7 2h10v20H7z M11 18h2',
    wallet: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h11v4 M16 13.5h.01',
    income: 'M12 3v12 M7 10l5 5 5-5 M4 15v5h16v-5',
    expense: 'M12 15V3 M7 8l5-5 5 5 M4 15v5h16v-5',
    transfer: 'M7 7h13 M16 3l4 4-4 4 M17 17H4 M8 13l-4 4 4 4',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4.2-4.2',
    close: 'M6 6l12 12 M18 6 6 18',
    prev: 'M9 6l6 6-6 6',
    next: 'M15 6l-6 6 6 6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    alert: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 20h16',
    upload: 'M12 15V3 M7 8l5-5 5 5 M4 20h16',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
    calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
    cash: 'M3 7h18v10H3z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M6 10h.01 M18 14h.01',
    card: 'M3 6h18v12H3z M3 10h18 M7 15h4',
    trend: 'M3 17l6-6 4 4 8-8 M15 7h6v6'
  };
  WR.icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${P[name] || P.dots}"/></svg>`;
  WR.ICON_NAMES = Object.keys(P);
  WR.MARK = '<svg class="brand-mark" viewBox="16 10 92 90" aria-hidden="true" focusable="false"><circle class="bm-coin" cx="52" cy="68" r="30" fill="#0F5E56"/><circle class="bm-ring" cx="52" cy="68" r="20" fill="none" stroke="#D9A441" stroke-width="5"/><path class="bm-arrow" d="M64 46 C74 30 88 24 100 26" fill="none" stroke="#E0674B" stroke-width="9" stroke-linecap="round"/><path class="bm-arrow" d="M89 16 L102 26 L91 37" fill="none" stroke="#E0674B" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
})(window.WR = window.WR || {});
