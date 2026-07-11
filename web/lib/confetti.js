// Lightweight canvas confetti — Signal Orange + white, no dependencies.
export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:120";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = window.innerWidth, H = window.innerHeight;

  const colors = ["#F26B3D", "#FAFAFA", "#FF8A5C", "#F26B3D", "#D4D4D4", "#FF7A45"];
  const cx = W / 2, cy = H * 0.3;
  const parts = Array.from({ length: 150 }, () => {
    const a = Math.random() * Math.PI * 2;
    const sp = 6 + Math.random() * 10;
    return {
      x: cx, y: cy,
      vx: Math.cos(a) * sp * (0.6 + Math.random()),
      vy: Math.sin(a) * sp - (5 + Math.random() * 5),
      size: 4 + Math.random() * 7,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
      life: 1,
    };
  });

  let frame = 0;
  const g = 0.3;
  function tick() {
    ctx.clearRect(0, 0, W, H);
    frame++;
    parts.forEach((p) => {
      p.vy += g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr; p.life -= 0.0075;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
      ctx.restore();
    });
    if (frame < 170) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}
