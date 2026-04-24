// Tabs
function switchTab(containerId, tabId) {
  var container = document.querySelector('[data-tabs="' + containerId + '"]');
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  container.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  container.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
  container.querySelector('[data-tab-panel="' + tabId + '"]').classList.add('active');
}

// Carousel
function carouselNav(id, dir) {
  var container = document.querySelector('[data-carousel="' + id + '"]');
  if (!container) return;
  var slides = container.querySelectorAll('.carousel-slide');
  var current = container.querySelector('.carousel-slide.active');
  var idx = Array.from(slides).indexOf(current);
  var next = idx + dir;
  if (next < 0) next = slides.length - 1;
  if (next >= slides.length) next = 0;
  current.classList.remove('active');
  slides[next].classList.add('active');
  updateDots(id, next);
}

function carouselGoTo(id, idx) {
  var container = document.querySelector('[data-carousel="' + id + '"]');
  if (!container) return;
  var slides = container.querySelectorAll('.carousel-slide');
  container.querySelector('.carousel-slide.active').classList.remove('active');
  slides[idx].classList.add('active');
  updateDots(id, idx);
}

function updateDots(id, activeIdx) {
  var dotsContainer = document.getElementById(id + '-dots');
  if (!dotsContainer) return;
  dotsContainer.querySelectorAll('.carousel-dot').forEach(function(d, i) {
    d.classList.toggle('active', i === activeIdx);
  });
}

// Initialize carousel dots on load
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.carousel-container').forEach(function(c) {
    var id = c.getAttribute('data-carousel');
    var slides = c.querySelectorAll('.carousel-slide');
    var dotsContainer = document.getElementById(id + '-dots');
    if (!dotsContainer) return;
    slides.forEach(function(_, i) {
      var dot = document.createElement('span');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.onclick = function() { carouselGoTo(id, i); };
      dotsContainer.appendChild(dot);
    });
  });

  // Keyboard navigation for carousels
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var carousel = document.querySelector('.carousel-container');
      if (carousel) {
        var id = carousel.getAttribute('data-carousel');
        carouselNav(id, e.key === 'ArrowRight' ? 1 : -1);
      }
    }
  });
});

// Before/After Toggle
function toggleBA(id, state) {
  var container = document.querySelector('[data-ba="' + id + '"]');
  if (!container) return;
  container.querySelectorAll('.ba-btn').forEach(function(b) { b.classList.remove('active'); });
  container.querySelectorAll('.ba-panel').forEach(function(p) { p.classList.remove('active'); });
  container.querySelector('[data-ba-state="' + state + '"]').classList.add('active');
  container.querySelector('[data-ba-panel="' + state + '"]').classList.add('active');
}
