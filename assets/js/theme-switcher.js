(function() {
  var STORAGE_KEY = 'camel-kit-theme';
  var THEMES = ['classic', 'colorful', 'dark'];
  var DEFAULT_THEME = 'classic';

  function getStoredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return THEMES.indexOf(stored) !== -1 ? stored : DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    document.querySelectorAll('[data-theme-btn]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === theme);
    });
  }

  setTheme(getStoredTheme());

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-theme-btn]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setTheme(btn.getAttribute('data-theme-btn'));
      });
    });
    setTheme(getStoredTheme());
  });
})();
