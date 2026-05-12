// Sheldon landing page — see docs/index.html

(function () {
  const STAR_COUNT = 160;
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield-canvas';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let rafId = null;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  const stars = [];

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: randomBetween(0.5, 2.0),
        phase: Math.random() * Math.PI * 2,
        speed: randomBetween(0.003, 0.015),
      });
    }
  }

  function drawStars(now) {
    ctx.clearRect(0, 0, width, height);
    const t = now * 0.001;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * star.speed * 60 + star.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#7df9ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStaticFrame() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(star.phase);
      ctx.fillStyle = '#7df9ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    drawStars(now);
    rafId = requestAnimationFrame(animate);
  }

  function onResize() {
    resize();
    initStars();
    if (reducedMotion) {
      drawStaticFrame();
    }
  }

  resize();
  initStars();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    drawStaticFrame();
  } else {
    rafId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', onResize, { passive: true });
}());
