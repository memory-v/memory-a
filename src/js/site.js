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
  return diffDays.toString().padStart(5, '0');
}

function applyAgeSignal(el) {
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

// ── IMAGE FADE-IN ──
// Images use the browser's native loading="lazy", which defers the actual
// download until the image nears the viewport. Fade each one in once it
// has actually loaded, rather than letting it pop in abruptly.
(function() {
  document.querySelectorAll('.primary img').forEach(function(img) {
    if (img.complete && img.naturalWidth) {
      img.classList.add('is-loaded');
    } else {
      img.addEventListener('load', function() {
        img.classList.add('is-loaded');
      }, { once: true });
    }
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
// Videos are marked preload="none" in the markup, so nothing downloads
// until this actually starts it — only once the video is near the
// viewport, via the IntersectionObserver below. Force explicit play() and
// hide native controls until hover, so autoplaying muted videos don't show
// a stuck idle-state overlay on load.
function wireVideoPlayback(video) {
  if (video._playbackWired) return;
  video._playbackWired = true;
  video.removeAttribute('controls');
  video.loop = true;
  video.play().catch(function() {});
  video.classList.add('is-loaded');
  video.addEventListener('mouseenter', function() {
    video.setAttribute('controls', 'controls');
  });
  video.addEventListener('mouseleave', function() {
    video.removeAttribute('controls');
  });
}

(function() {
  var videos = document.querySelectorAll('.primary video');
  if (!videos.length) return;

  if (!('IntersectionObserver' in window)) {
    // No observer support — fall back to loading everything up front.
    videos.forEach(wireVideoPlayback);
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        wireVideoPlayback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '400px 0px' }); // start loading a bit before it's on screen

  videos.forEach(function(video) {
    observer.observe(video);
  });
})();

// ── VOICE MEMO PLAYER ──
// Simple custom play/pause + progress line, wired to a hidden native
// <audio> element (kept preload="none" so nothing downloads until played).
(function() {
  var players = document.querySelectorAll('.voice-player');
  if (!players.length) return;

  var PLAY = '▶';   // ▶
  var PAUSE = '❚❚'; // ❚❚
  var BOOST = 2.5; // amplify above the raw recording's own volume

  // Web Audio API only lets us route an <audio> element through a gain
  // boost once, and only after a real user gesture (the click) — so this
  // is set up lazily, the first time each player is actually pressed.
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;

  function wireVolumeBoost(audio) {
    if (!AudioContextClass || audio._boosted) return;
    audio._boosted = true;
    try {
      var ctx = new AudioContextClass();
      var source = ctx.createMediaElementSource(audio);
      var gainNode = ctx.createGain();
      gainNode.gain.value = BOOST;
      source.connect(gainNode).connect(ctx.destination);
      audio._audioCtx = ctx;
    } catch (e) {
      // If the browser can't do this for some reason, playback still
      // works fine at the recording's natural volume.
    }
  }

  players.forEach(function(player) {
    var audio = player.querySelector('audio');
    var btn = player.querySelector('.voice-play-btn');
    var fill = player.querySelector('.voice-progress-fill');
    if (!audio || !btn || !fill) return;

    btn.addEventListener('click', function() {
      // Pause any other currently-playing voice memo first — only one at
      // a time makes sense for a spoken recording.
      document.querySelectorAll('.voice-player audio').forEach(function(other) {
        if (other !== audio && !other.paused) other.pause();
      });

      if (audio.paused) {
        wireVolumeBoost(audio);
        if (audio._audioCtx && audio._audioCtx.state === 'suspended') {
          audio._audioCtx.resume();
        }
        audio.play().catch(function() {});
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function() {
      btn.innerHTML = PAUSE;
    });
    audio.addEventListener('pause', function() {
      btn.innerHTML = PLAY;
    });
    audio.addEventListener('ended', function() {
      btn.innerHTML = PLAY;
      fill.style.width = '0%';
    });
    audio.addEventListener('timeupdate', function() {
      if (!audio.duration) return;
      fill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    });
  });
})();

// ── SONG LIST FADE-IN ──
// Rows fade in top to bottom, staggered across a fixed total duration
// regardless of how many songs there are — so this stays quick even as
// the archive grows, rather than a fixed delay per row.
function initSongFadeIn() {
  var rows = document.querySelectorAll('.song-row');
  if (!rows.length) return;

  var totalMs = 2000;
  rows.forEach(function(row, i) {
    var delay = rows.length > 1 ? (i / (rows.length - 1)) * totalMs : 0;
    setTimeout(function() {
      row.classList.add('is-visible');
    }, delay);
  });
}

// ── MEMORY HOLES ──
// Random blurred fixed patches — only on the feed, not single-post pages.
// Held back until after the page-reveal fade finishes (see PAGE REVEAL
// below), so they visibly fade in on top of the settled page rather than
// appearing already-there the instant the white cover lifts.
function initMemoryHoles() {
  if (document.querySelector('.archive.permalink-view')) return;

  var body = document.body;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  var count = Math.floor(Math.random() * 4) + 5;

  // Divide the viewport into a loose grid with roughly one cell per hole,
  // and keep each hole confined to its own cell (with jitter inside it)
  // for its whole lifetime. Pure independent randomness, at only 5-8
  // points, clusters far more often than it looks "evenly scattered" —
  // this guarantees spread by construction while the jitter keeps it
  // from reading as a rigid, obviously-gridded layout.
  var cols = Math.ceil(Math.sqrt(count));
  var rows = Math.ceil(count / cols);

  // Sized as a percentage of the current viewport rather than fixed
  // pixels, so a hole reads as "roughly the same relative size" on any
  // device — but also capped to a fraction of its own zone's dimensions,
  // so it can never grow large enough to spill into a neighboring zone
  // and recreate the clustering effect from within a single cell.
  function randomize(hole) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var zone = hole._zone;

    var zonePxW = (vw / cols);
    var zonePxH = (vh / rows);
    var zoneCap = Math.min(zonePxW, zonePxH) * 0.7;

    // Size as a fraction of this zone's own cap, not an absolute value
    // clamped down afterward — that old approach pushed most rolls to the
    // same ceiling instead of a real spread. Skewed toward the smaller
    // end (squaring the random factor) so small/medium holes are common
    // and the occasional one near the cap reads as a real accent, while
    // the maximum size stays exactly where it was.
    var minFactor = 0.18;
    var skew = Math.pow(Math.random(), 1.6);
    var size = zoneCap * (minFactor + (1 - minFactor) * skew);

    // More generous, size-relative aspect jitter for real shape variety
    // (a tall sliver here, a wide one there) rather than everything being
    // a near-square blob.
    var w = clamp(size + (Math.random() * size * 0.6) - size * 0.3, 20, zoneCap);
    var h = clamp(size + (Math.random() * size * 0.6) - size * 0.3, 20, zoneCap);

    // Jitter within the zone, in vw/vh so it still responds correctly to
    // the live resize handler below.
    var zoneVwW = 100 / cols;
    var zoneVhH = 100 / rows;
    var marginVw = zoneVwW * 0.15;
    var marginVh = zoneVhH * 0.15;
    var x = zone.col * zoneVwW + marginVw + Math.random() * Math.max(0, zoneVwW - marginVw * 2);
    var y = zone.row * zoneVhH + marginVh + Math.random() * Math.max(0, zoneVhH - marginVh * 2);

    var blur = Math.floor(Math.random() * 6) + 6;

    hole.style.width  = w + 'px';
    hole.style.height = h + 'px';
    hole.style.left   = x + 'vw';
    hole.style.top    = y + 'vh';
    hole.style.backdropFilter = 'blur(' + blur + 'px)';
    hole.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
  }

  var holes = [];

  // Each hole runs its own independent cycle — fade out, reposition,
  // fade back in, wait a random stretch, repeat — rather than a single
  // shared timer touching one hole at a time. That avoids both the
  // initial batch reading as one synchronized wave, and any individual
  // hole going untouched for an oddly long stretch by chance.
  // Fade-out and fade-in run at different speeds — a slow 4s dissolve out,
  // a quicker 2s return — so vanishing feels like a still, mirage-like
  // drift while reappearing doesn't feel sluggish.
  function fadeOut(hole) {
    hole.style.transitionDuration = '4s';
    hole.classList.remove('is-visible');
  }
  function fadeIn(hole) {
    hole.style.transitionDuration = '1s';
    hole.classList.add('is-visible');
  }

  function cycleForever(hole) {
    (function scheduleNext() {
      var delay = 6000 + Math.random() * 8000; // sit still for 6–14s
      setTimeout(function() {
        fadeOut(hole);
        setTimeout(function() {
          randomize(hole);
          fadeIn(hole);
          scheduleNext();
        }, 4000); // matches the fade-out duration above
      }, delay);
    })();
  }

  for (var i = 0; i < count; i++) {
    (function(index) {
      var hole = document.createElement('div');
      hole.className = 'memory-hole';
      hole._zone = { col: index % cols, row: Math.floor(index / cols) };
      randomize(hole);
      body.appendChild(hole);
      holes.push(hole);

      // Small randomized offset so the initial batch doesn't fade in as
      // one perfectly synchronized wave, but still starts essentially
      // together with the page-reveal white fade.
      setTimeout(function() {
        fadeIn(hole);
        cycleForever(hole);
      }, Math.random() * 400);
    })(i);
  }

  // Re-size (and reposition) every hole immediately when the window is
  // resized, rather than waiting for its next scheduled cycle — otherwise
  // sizes computed for the old viewport width would sit there unchanged
  // until each hole happened to cycle on its own.
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      holes.forEach(function(hole) {
        randomize(hole);
      });
    }, 150);
  });
}

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

// ── SHUFFLE — random song order on every load of the listening page ──
(function() {
  var list = document.querySelector('.song-list');
  if (!list) return;
  var rows = Array.from(list.querySelectorAll('.song-row'));
  if (rows.length < 2) return;

  for (var i = rows.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = rows[i];
    rows[i] = rows[j];
    rows[j] = temp;
  }

  rows.forEach(function(row) {
    list.appendChild(row);
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

// ── PAGE REVEAL ──
// By this point shuffle order and spatial-drift positions have already
// been applied (both ran synchronously above) — but they, and any images
// still loading, are hidden behind the white cover. Wait for whatever's
// currently in the viewport to finish loading, then fade the cover away
// once, so the visitor sees the finished layout appear in a single
// deliberate motion rather than watching it assemble itself.
(function() {
  var reveal = document.getElementById('pageReveal');
  if (!reveal) return;

  var pageStart = Date.now();
  var MIN_HOLD_MS = 1000; // stay solid white for at least this long

  function hideReveal() {
    var elapsed = Date.now() - pageStart;
    var wait = Math.max(0, MIN_HOLD_MS - elapsed);
    setTimeout(function() {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          reveal.classList.add('is-hidden');
          // Start the memory holes / song rows fading in right alongside
          // the white fade, rather than waiting for it to finish first.
          if (typeof initMemoryHoles === 'function') initMemoryHoles();
          if (typeof initSongFadeIn === 'function') initSongFadeIn();
        });
      });
    }, wait);
  }

  var visible = [];
  document.querySelectorAll('.primary img, .primary video').forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      visible.push(el);
    }
  });

  var pending = visible.filter(function(el) {
    return el.tagName === 'IMG' ? !el.complete : el.readyState < 2;
  });

  if (pending.length === 0) {
    hideReveal();
    return;
  }

  var remaining = pending.length;
  function done() {
    remaining--;
    if (remaining <= 0) hideReveal();
  }

  pending.forEach(function(el) {
    var loadEvent = el.tagName === 'IMG' ? 'load' : 'loadeddata';
    el.addEventListener(loadEvent, done, { once: true });
    el.addEventListener('error', done, { once: true });
  });

  // Safety net — never leave a visitor staring at a blank white page if a
  // file is slow or fails to load.
  setTimeout(hideReveal, 3000);
})();
