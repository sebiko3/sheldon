// Sheldon landing page — 3D warp-speed starfield

(function () {
  const STAR_COUNT = 300;
  const MAX_Z = 1000;
  const SPEED = 0.42;
  const FOCAL = 600;
  const NEAR_PLANE = 1;

  const canvas = document.createElement('canvas');
  canvas.id = 'starfield-canvas';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let cx = 0;
  let cy = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cx = width / 2;
    cy = height / 2;
  }

  const stars = [];

  function resetStar(star) {
    star.x = (Math.random() - 0.5) * width;
    star.y = (Math.random() - 0.5) * height;
    star.z = Math.random() * MAX_Z + NEAR_PLANE;
    star.px = null;
    star.py = null;
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = { x: 0, y: 0, z: 0, px: null, py: null };
      resetStar(s);
      stars.push(s);
    }
  }

  function project(star) {
    const scale = FOCAL / star.z;
    return {
      sx: star.x * scale + cx,
      sy: star.y * scale + cy,
      size: Math.max(0.3, (1 - star.z / MAX_Z) * 3.5),
      alpha: Math.max(0.05, 1 - star.z / MAX_Z),
    };
  }

  function drawFrame(animate) {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];

      if (animate) {
        const prevProj = (star.px !== null) ? { sx: star.px, sy: star.py } : null;
        star.z -= SPEED;
        if (star.z <= NEAR_PLANE) {
          resetStar(star);
          continue;
        }
        const p = project(star);

        // depth-based cyan-to-white: close stars are white, far are cyan
        const depth = 1 - star.z / MAX_Z;
        const g = Math.round(200 + 55 * depth);
        const color = `rgb(${Math.round(180 + 75 * depth)},${g},255)`;

        if (prevProj) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.globalAlpha = p.alpha * 0.5;
          ctx.lineWidth = p.size * 0.6;
          ctx.moveTo(prevProj.sx, prevProj.sy);
          ctx.lineTo(p.sx, p.sy);
          ctx.stroke();
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2);
        ctx.fill();

        star.px = p.sx;
        star.py = p.sy;
      } else {
        const p = project(star);
        const depth = 1 - star.z / MAX_Z;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `rgb(${Math.round(180 + 75 * depth)},${Math.round(200 + 55 * depth)},255)`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  function animate() {
    drawFrame(true);
    requestAnimationFrame(animate);
  }

  function onResize() {
    resize();
    initStars();
    if (reducedMotion) {
      drawFrame(false);
    }
  }

  resize();
  initStars();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    drawFrame(false);
  } else {
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', onResize, { passive: true });

  // ── Matrix-scramble effect on headings ────────────────────────────────────
  // Each character cycles through random glyphs before locking in. Uses RAF
  // for the animation loop (no setInterval — per project convention).
  // Triggers on viewport entry via IntersectionObserver; the hero title also
  // re-runs at random intervals so the centerpiece stays alive.
  if (!reducedMotion) {
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    const LOCK_DELAY_PER_CHAR = 260; // ms before character N stops scrambling
    const FRAME_MS = 80;             // visible character cycle time
    const HERO_REPEAT_MIN_MS = 18000;
    const HERO_REPEAT_MAX_MS = 45000;

    function scramble(el, onDone) {
      const target = el.dataset.text || el.textContent;
      el.classList.add('scrambling');
      const startTime = performance.now();
      let lastFrame = 0;

      function frame(now) {
        const elapsed = now - startTime;
        if (now - lastFrame >= FRAME_MS) {
          const out = Array.from(target, (ch, i) => {
            if (elapsed >= LOCK_DELAY_PER_CHAR * (i + 1)) return ch;
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          }).join('');
          el.textContent = out;
          lastFrame = now;
          if (out === target) {
            el.classList.remove('scrambling');
            if (onDone) onDone();
            return;
          }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    // Hero: scramble immediately + repeat at random intervals.
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
      const scheduleNext = () => {
        const delay = HERO_REPEAT_MIN_MS + Math.random() * (HERO_REPEAT_MAX_MS - HERO_REPEAT_MIN_MS);
        setTimeout(() => scramble(heroTitle, scheduleNext), delay);
      };
      scramble(heroTitle, scheduleNext);
    }

    // Every other [data-text] heading: scramble once, the first time it
    // scrolls into view. Disconnect after firing so it doesn't re-trigger
    // on every scroll.
    const others = Array.from(document.querySelectorAll('[data-text]')).filter((el) => el !== heroTitle);
    if (others.length) {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, observer) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              scramble(entry.target);
              observer.unobserve(entry.target);
            }
          }
        }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
        for (const el of others) io.observe(el);
      } else {
        // No IO support: just scramble them all up front.
        for (const el of others) scramble(el);
      }
    }
  }
}());
