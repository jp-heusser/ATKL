/* Fondo de rayos interactivo (canvas 2D, sin librerías).
   - Cada pocos segundos cae un rayo ramificado desde arriba, con un destello suave.
   - Un clic o toque hace caer un rayo justo en ese punto, con chispas.
   - En escritorio, el cursor suelta pequeños arcos eléctricos al moverse.
   Se pausa con la pestaña oculta y se desactiva con "reducir movimiento".

   Ajustes rápidos: */
const MIN_GAP = 1400; // ms mínimo entre rayos automáticos
const MAX_GAP = 4200; // ms máximo entre rayos automáticos
const FLASH = 0.07; // intensidad del destello de pantalla (0 = sin destello)
const RED = '238,45,61';

import { useEffect, useRef } from 'react';

const rand = (a, b) => a + Math.random() * (b - a);

// Línea quebrada entre dos puntos (desplazamiento del punto medio).
function jagged(x1, y1, x2, y2, disp, out = [[x1, y1]]) {
  if (disp < 3) {
    out.push([x2, y2]);
    return out;
  }
  const mx = (x1 + x2) / 2 + rand(-disp, disp);
  const my = (y1 + y2) / 2 + rand(-disp, disp) * 0.35;
  jagged(x1, y1, mx, my, disp / 2, out);
  jagged(mx, my, x2, y2, disp / 2, out);
  return out;
}

// Rayo principal + ramas.
function makeBolt(x1, y1, x2, y2, width = 2.2, depth = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const pts = jagged(x1, y1, x2, y2, len / 7);
  const lines = [{ pts, width }];
  if (depth < 2) {
    const branches = depth === 0 ? Math.round(rand(2, 5)) : Math.round(rand(0, 2));
    for (let i = 0; i < branches; i++) {
      const [bx, by] = pts[Math.floor(rand(0.15, 0.85) * pts.length)];
      const ang = Math.atan2(y2 - y1, x2 - x1) + rand(-0.9, 0.9);
      const blen = len * rand(0.18, 0.42);
      lines.push(...makeBolt(bx, by, bx + Math.cos(ang) * blen, by + Math.sin(ang) * blen, width * 0.55, depth + 1));
    }
  }
  return lines;
}

export default function Lightning() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let raf = 0;
    let nextStrike = performance.now() + 700;
    let lastArc = 0;
    let bolts = []; // { lines, life, decay, flash }
    let sparks = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const strike = (tx, ty, flash = FLASH) => {
      const sx = tx + rand(-w * 0.25, w * 0.25);
      bolts.push({ lines: makeBolt(sx, -20, tx, ty), life: 1, decay: rand(0.03, 0.05), flash });
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);

      if (now > nextStrike) {
        strike(rand(w * 0.05, w * 0.95), rand(h * 0.45, h * 1.05));
        // a veces, un segundo rayo casi inmediato
        nextStrike = now + (Math.random() < 0.25 ? rand(90, 220) : rand(MIN_GAP, MAX_GAP));
      }

      ctx.clearRect(0, 0, w, h);
      if (!bolts.length && !sparks.length) return;

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        // parpadeo irregular mientras se apaga
        const a = b.life * (b.life > 0.5 ? rand(0.55, 1) : 1);

        if (b.flash && b.life > 0.75) {
          ctx.fillStyle = `rgba(255,235,238,${b.flash * b.life})`;
          ctx.fillRect(0, 0, w, h);
        }

        for (const { pts, width } of b.lines) {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
          // resplandor rojo
          ctx.shadowColor = `rgba(${RED},${a})`;
          ctx.shadowBlur = 22;
          ctx.strokeStyle = `rgba(${RED},${a * 0.75})`;
          ctx.lineWidth = width * 3.2;
          ctx.stroke();
          // núcleo blanco
          ctx.shadowBlur = 8;
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = width;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        b.life -= b.decay;
        if (b.life <= 0) bolts.splice(i, 1);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.18;
        s.life -= 0.03;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(${s.c},${s.life})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    };

    // Clic / toque: rayo al punto + chispas.
    const onDown = (e) => {
      strike(e.clientX, e.clientY, FLASH * 0.7);
      for (let i = 0; i < 22; i++) {
        const ang = rand(0, Math.PI * 2);
        const sp = rand(1.5, 6);
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 1.5,
          life: 1,
          size: rand(1.5, 3),
          c: Math.random() < 0.6 ? RED : '255,255,255',
        });
      }
    };

    // Cursor (solo mouse): pequeños arcos eléctricos.
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - lastArc < 90) return;
      lastArc = now;
      const ang = rand(0, Math.PI * 2);
      const len = rand(30, 90);
      bolts.push({
        lines: makeBolt(e.clientX, e.clientY, e.clientX + Math.cos(ang) * len, e.clientY + Math.sin(ang) * len, 1, 1),
        life: 0.8,
        decay: 0.09,
        flash: 0,
      });
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        nextStrike = performance.now() + 600;
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
