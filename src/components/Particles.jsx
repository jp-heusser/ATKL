/* Fondo de partículas interactivo (canvas 2D, sin librerías).
   - Las partículas flotan y se unen con líneas cuando están cerca.
   - Huyen del cursor / dedo y se conectan a él con líneas rojas.
   - Cada clic o toque lanza una ráfaga.
   Se pausa con la pestaña oculta y se desactiva con "reducir movimiento". */
import { useEffect, useRef } from 'react';

const RED = '238,45,61';
const WHITE = '255,255,255';
const LINK_DIST = 110; // distancia para unir partículas
const POINTER_DIST = 150; // radio de influencia del cursor

export default function Particles() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let parts = [];
    let sparks = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const make = () => {
      const red = Math.random() < 0.22;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.08 + Math.random() * 0.3), // suben lento, como brasas
        r: red ? 1.2 + Math.random() * 1.6 : 0.6 + Math.random() * 1.2,
        c: red ? RED : WHITE,
        a: 0.35 + Math.random() * 0.55,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.round((w * h) / 11000));
      parts = Array.from({ length: count }, make);
      if (reduce) draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (!reduce) {
          // repulsión del cursor
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (pointer.active && d2 < POINTER_DIST * POINTER_DIST && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / POINTER_DIST) * 0.6;
            p.x += (dx / d) * f * 3;
            p.y += (dy / d) * f * 3;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) (p.y = h + 10), (p.x = Math.random() * w);
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }

        // líneas entre partículas cercanas
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(${WHITE},${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // líneas rojas hacia el cursor
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < POINTER_DIST) {
            ctx.strokeStyle = `rgba(${RED},${(1 - d / POINTER_DIST) * 0.55})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${p.c},${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ráfagas de clic
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= 0.025;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(${s.c},${s.life})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = (e) => {
      onMove(e);
      if (reduce) return;
      for (let i = 0; i < 26; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 5;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 1,
          size: 1.5 + Math.random() * 2,
          c: Math.random() < 0.7 ? RED : WHITE,
        });
      }
      if (e.pointerType === 'touch') setTimeout(onLeave, 600);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };

    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
