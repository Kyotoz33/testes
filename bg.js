// Fundo animado discreto: partículas lentas + raros riscos de luz.
(() => {
  const cv = document.getElementById("bg");
  const ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, dots, streaks = [], last = 0;

  function resize() {
    const r = devicePixelRatio || 1;
    w = cv.width = innerWidth * r; h = cv.height = innerHeight * r;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    const n = Math.min(90, Math.round((innerWidth * innerHeight) / 18000));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: (Math.random() * 1.1 + 0.4) * r,
      vy: (Math.random() * 0.12 + 0.03) * r, vx: (Math.random() - 0.5) * 0.04 * r,
      a: Math.random() * 0.35 + 0.08, p: Math.random() * 6.28, s: Math.random() * 0.01 + 0.004,
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.y -= d.vy; d.x += d.vx; d.p += d.s;
      if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      ctx.fillStyle = `rgba(242,240,234,${d.a * (0.6 + 0.4 * Math.sin(d.p))})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.28); ctx.fill();
    }
    if (!still && t - last > 6000 && Math.random() < 0.01) {
      last = t;
      streaks.push({ x: Math.random() * w * 0.8, y: Math.random() * h * 0.5, life: 0 });
    }
    streaks = streaks.filter((s) => s.life < 1);
    for (const s of streaks) {
      s.life += 0.012;
      const len = 140 * (devicePixelRatio || 1), x = s.x + s.life * len * 2.2, y = s.y + s.life * len * 1.1;
      const g = ctx.createLinearGradient(x - len, y - len / 2, x, y);
      g.addColorStop(0, "rgba(242,240,234,0)");
      g.addColorStop(1, `rgba(242,240,234,${0.35 * Math.sin(s.life * Math.PI)})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - len, y - len / 2); ctx.lineTo(x, y); ctx.stroke();
    }
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
