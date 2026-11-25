/* دبّرها — splash.js: dismisses the launch screen in index.html.
   Waits for the brand fonts (so the name never swaps font mid-animation),
   lets the animation finish, then fades into the app. Tap skips it. */
(function () {
  'use strict';
  const splash = document.getElementById('splash');
  if (!splash) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = reduced ? 700 : 2300;   // time on screen before leaving
  const LEAVE = reduced ? 200 : 450;   // matches .is-leaving in splash.css
  let done = false;

  // Hold every animation until Marhey/Rubik are ready (max 600 ms), so the
  // name is drawn in the same font the app uses.
  splash.style.animationPlayState = 'paused';
  const paused = [...splash.querySelectorAll('*')];
  paused.forEach(el => { el.style.animationPlayState = 'paused'; });
  const fonts = document.fonts
    ? Promise.all([document.fonts.load('700 46px Marhey', 'دبّرها'), document.fonts.load('400 15px Rubik', 'دبّرها')])
    : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 600))]).catch(() => {}).then(() => {
    splash.style.animationPlayState = '';
    paused.forEach(el => { el.style.animationPlayState = ''; });
    setTimeout(leave, HOLD);
  });

  function leave() {
    if (done) return;
    done = true;
    splash.classList.add('is-leaving');
    setTimeout(() => splash.remove(), LEAVE);
  }
  splash.addEventListener('click', leave);
})();
