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

  // ── Matrix-scramble effect on the hero title ──────────────────────────────
  // Each character cycles through random glyphs before locking in. Uses RAF
  // (no setInterval — per project convention). Cyan glow styling lives in CSS.
  // After the initial run the effect re-triggers at random intervals between
  // REPEAT_MIN_MS and REPEAT_MAX_MS for a subtle "the system is alive" feel.
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle && !reducedMotion) {
    const target = heroTitle.dataset.text || heroTitle.textContent;
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    const lockDelayPerChar = 260; // ms before character N stops scrambling
    const frameMs = 80;           // visible character cycle time
    const REPEAT_MIN_MS = 18000;  // shortest pause between re-runs
    const REPEAT_MAX_MS = 45000;  // longest pause between re-runs

    function runScramble() {
      heroTitle.classList.add('scrambling');
      const startTime = performance.now();
      let lastFrame = 0;

      function scrambleFrame(now) {
        const elapsed = now - startTime;
        if (now - lastFrame >= frameMs) {
          const out = Array.from(target, (ch, i) => {
            if (elapsed >= lockDelayPerChar * (i + 1)) return ch;
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          }).join('');
          heroTitle.textContent = out;
          lastFrame = now;
          if (out === target) {
            heroTitle.classList.remove('scrambling');
            scheduleNext();
            return;
          }
        }
        requestAnimationFrame(scrambleFrame);
      }
      requestAnimationFrame(scrambleFrame);
    }

    function scheduleNext() {
      const delay = REPEAT_MIN_MS + Math.random() * (REPEAT_MAX_MS - REPEAT_MIN_MS);
      setTimeout(runScramble, delay);
    }

    runScramble();
  }
}());
