/* Mobile nav toggle */
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('nav ul');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      menu.classList.toggle('open');
    });
  }

  /* Mark active page */
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(function (a) {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
});

/* Language switch (EN / KO) — no-op on pages without .lang-switch */
document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('.lang-switch button[data-set-lang]');
  if (!buttons.length) return;

  function apply(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-set-lang') === lang);
    });
    try { localStorage.setItem('cmlab-lang', lang); } catch (e) {}
  }

  /* precedence: ?lang= in the URL > stored preference > English */
  let saved = new URLSearchParams(location.search).get('lang');
  if (saved !== 'en' && saved !== 'ko') {
    try { saved = localStorage.getItem('cmlab-lang'); } catch (e) { saved = null; }
  }
  if (saved !== 'en' && saved !== 'ko') { saved = 'en'; }  /* English is the default */
  apply(saved);

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      apply(b.getAttribute('data-set-lang'));
    });
  });
});
