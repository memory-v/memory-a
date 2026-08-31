// ── DISABLE RIGHT-CLICK MENU ON MEDIA ──
// Discourages "Open image in new tab" / "Save image as" from the casual
// right-click menu. Not a real barrier — browsers always let a determined
// visitor inspect or save media — just removes the obvious shortcut.
document.addEventListener('contextmenu', function(e) {
  if (e.target.closest('.primary')) {
    e.preventDefault();
  }
});

// ── AGE SIGNAL ──
// Calculates days since post date and injects into .age-signal
function formatAgeSignal(dateStr) {
  var parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  var year  = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1;
  var day   = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  var postDate = new Date(year, month, day);
  var now = new Date();
  var nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var diffDays = Math.floor((nowDate - postDate) / (1000 * 60 * 60 * 24));
  return diffDays.toString().padStart(4, '0');
}

function applyAgeSignal(post) {
  var el = post.querySelector ? post.querySelector('.age-signal') : post;
  if (!el) return;
  var dateStr = el.getAttribute('data-post-date');
  if (!dateStr) return;
  var padded = formatAgeSignal(dateStr);
  if (padded !== null) el.textContent = padded;
}

(function() {
  document.querySelectorAll('.age-signal').forEach(function(el) {
    applyAgeSignal(el);
  });
})();

// ── IMAGE-WIDTH ALIGNMENT ──
// Portrait images are height-capped (see .primary img), so they render
// narrower than the post's full width and get centered. Measure the actual
// rendered image width in JS and constrain/center the caption and age-signal
// to match.
function alignPostToImage(post) {
  var img = post.querySelector('.primary img');
  if (!img) return;

  function apply() {
    var imgWidth = img.getBoundingClientRect().width;
    var postWidth = post.getBoundingClientRect().width;
    var caption = post.querySelector('.caption');
    var headerRow = post.querySelector('.post-header-row');
    var age = headerRow || post.querySelector('.age-signal');

    var narrow = imgWidth > 0 && imgWidth < postWidth - 4;

    [caption, age].forEach(function(el) {
      if (!el) return;
      if (narrow) {
        el.style.maxWidth = imgWidth + 'px';
        el.style.marginLeft = 'auto';
        el.style.marginRight = 'auto';
      } else {
        el.style.maxWidth = '';
        el.style.marginLeft = '';
        el.style.marginRight = '';
      }
    });
  }

  if (img.complete) {
    apply();
  } else {
    img.addEventListener('load', apply, { once: true });
  }

  return apply;
}

(function() {
  var reapply = [];
  document.querySelectorAll('.post').forEach(function(post) {
    var fn = alignPostToImage(post);
    if (fn) reapply.push(fn);
  });

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      reapply.forEach(function(fn) { fn(); });
    }, 120);
  });
})();

// ── VIDEO PLAYBACK ──
// Force explicit play() and hide native controls until hover, so autoplaying
// muted videos don't show a stuck idle-state overlay on load.
function wireVideoPlayback(video) {
  if (video._playbackWired) return;
  video._playbackWired = true;
  video.removeAttribute('controls');
  video.loop = true;
  video.play().catch(function() {});
  video.addEventListener('mouseenter', function() {
    video.setAttribute('controls', 'controls');
  });
  video.addEventListener('mouseleave', function() {
    video.removeAttribute('controls');
  });
}

(function() {
  document.querySelectorAll('.primary video').forEach(wireVideoPlayback);
})();

// ── VOID ──
(function() {
  var overlay = document.getElementById('voidOverlay');
  if (!overlay) return;

  var scrollLock = function(e) { e.preventDefault(); e.stopPropagation(); return false; };

  function openVoid() {
    overlay.style.opacity = '0';
    overlay.style.display = 'flex';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.style.opacity = '1';
        window.addEventListener('wheel', scrollLock, { passive: false });
        window.addEventListener('touchmove', scrollLock, { passive: false });
      });
    });
  }

  function closeVoid() {
    overlay.style.opacity = '0';
    window.removeEventListener('wheel', scrollLock);
    window.removeEventListener('touchmove', scrollLock);
    setTimeout(function() {
      overlay.style.display = 'none';
    }, 1600);
  }

  document.querySelectorAll('.ctrl-void').forEach(function(btn) {
    btn.addEventListener('click', openVoid);
  });

  overlay.addEventListener('click', closeVoid);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeVoid();
  });
})();

// ── MEMORY HOLES ──
// Random blurred fixed patches — only on the feed, not single-post pages.
(function() {
  if (document.querySelector('.archive.permalink-view')) return;

  var count = Math.floor(Math.random() * 4) + 7;
  var body = document.body;

  var isMobile = window.innerWidth <= 800;
  var sizeMin = isMobile ? 40 : 80;
  var sizeRange = isMobile ? 100 : 200;
  var largeMin = isMobile ? 150 : 300;
  var largeRange = isMobile ? 50 : 100;

  for (var i = 0; i < count; i++) {
    (function(index) {
      var hole = document.createElement('div');
      hole.className = 'memory-hole';

      var size = Math.floor(Math.random() * sizeRange) + sizeMin;
      if (Math.random() < 0.2) size = Math.floor(Math.random() * largeRange) + largeMin;
      var w = size + Math.floor(Math.random() * 40) - 20;
      var h = size + Math.floor(Math.random() * 40) - 20;

      var x = Math.floor(Math.random() * 90) + 2;
      var y = Math.floor(Math.random() * 85) + 5;

      var blur = Math.floor(Math.random() * 6) + 6;

      hole.style.width  = w + 'px';
      hole.style.height = h + 'px';
      hole.style.left   = x + 'vw';
      hole.style.top    = y + 'vh';
      hole.style.backdropFilter = 'blur(' + blur + 'px)';
      hole.style.webkitBackdropFilter = 'blur(' + blur + 'px)';

      body.appendChild(hole);

      setTimeout(function() {
        hole.classList.add('is-visible');
      }, 300 + index * 120);
    })(i);
  }
})();

// ── SHUFFLE — random post order on every page load (feed only) ──
(function() {
  var archive = document.querySelector('.archive:not(.permalink-view)');
  if (!archive) return;
  var posts = Array.from(archive.querySelectorAll('.post'));
  if (posts.length < 2) return;

  for (var i = posts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = posts[i];
    posts[i] = posts[j];
    posts[j] = temp;
  }

  posts.forEach(function(post) {
    archive.appendChild(post);
  });
})();

// ── SPATIAL DRIFT — random horizontal offset per post per load (feed only) ──
(function() {
  function randomFraction() {
    var min = 0.25;
    var max = 0.85;
    var magnitude = min + Math.random() * (max - min);
    return Math.random() > 0.5 ? magnitude : -magnitude;
  }

  function applyOffsets() {
    var posts = document.querySelectorAll('.archive:not(.permalink-view) .post');
    var vw = window.innerWidth;

    posts.forEach(function(post) {
      var postWidth = post.offsetWidth;
      var availableMargin = (vw - postWidth) / 2;

      if (availableMargin <= 20) {
        post.style.transform = 'translateX(0)';
        return;
      }

      var fraction = post._driftFraction;
      if (fraction === undefined) {
        fraction = randomFraction();
        post._driftFraction = fraction;
      }

      var maxOffset = availableMargin - 20;
      var offset = Math.round(fraction * maxOffset);
      post.style.transform = 'translateX(' + offset + 'px)';
    });
  }

  applyOffsets();

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyOffsets, 16);
  });
})();
