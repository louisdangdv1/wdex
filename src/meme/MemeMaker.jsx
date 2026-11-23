import { useEffect, useRef, useState } from 'react';
import Frog, { MOODS } from './Frog';

const BACKGROUNDS = {
  Swamp: ['#0f3d2a', '#2e8b57'],
  Moon: ['#140b3d', '#3a1d8f'],
  Pump: ['#0b3d0b', '#7CFC00'],
  Rekt: ['#3d0b0b', '#e53935'],
  Gold: ['#5a3d00', '#ffd84d'],
};
const STICKERS = ['', '🚀', '💎', '🌕', '🔥', '🪰', '📉', '📈'];
const PRESETS = [
  ['WHEN YOU SET A STOP LOSS', 'AND IT ACTUALLY SAVES YOU'],
  ['125X LONG AT THE TOP', 'RIBBIT'],
  ['ME: I’LL JUST PRACTICE', 'ALSO ME: 125X EVERYTHING'],
  ['PAPER HANDS', 'DIAMOND WEBS'],
];

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export default function MemeMaker() {
  const canvasRef = useRef(null);
  const frogRef = useRef(null);
  const [mood, setMood] = useState('happy');
  const [bg, setBg] = useState('Swamp');
  const [sticker, setSticker] = useState('🚀');
  const [top, setTop] = useState(PRESETS[0][0]);
  const [bottom, setBottom] = useState(PRESETS[0][1]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const svg = frogRef.current?.querySelector('svg');
    if (!canvas || !svg) return;
    const ctx = canvas.getContext('2d');
    const S = canvas.width;
    const draw = (img) => {
      const [c1, c2] = BACKGROUNDS[bg];
      const grad = ctx.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, S, S);
      // light rays
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.translate(S / 2, S / 2);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-40, -S);
        ctx.lineTo(40, -S);
        ctx.fill();
      }
      ctx.restore();
      if (img) ctx.drawImage(img, S * 0.2, S * 0.2, S * 0.6, S * 0.6 * 1.09);
      if (sticker) {
        ctx.font = `${S * 0.14}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(sticker, S * 0.82, S * 0.34);
      }
      // classic meme text
      const drawText = (text, y, fromBottom) => {
        if (!text) return;
        ctx.font = `900 ${S * 0.085}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = S * 0.014;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        const lines = wrapText(ctx, text.toUpperCase(), S * 0.92);
        const lh = S * 0.09;
        lines.forEach((l, i) => {
          const yy = fromBottom ? y - (lines.length - 1 - i) * lh : y + i * lh;
          ctx.strokeText(l, S / 2, yy);
          ctx.fillText(l, S / 2, yy);
        });
      };
      drawText(top, S * 0.11, false);
      drawText(bottom, S * 0.95, true);
      // watermark
      ctx.font = `700 ${S * 0.03}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillText('🐸 WPEPE', S - 12, S - 10);
    };
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  }, [mood, bg, sticker, top, bottom]);

  const download = () => {
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `wpepe-meme-${Date.now()}.png`;
    a.click();
    try {
      localStorage.setItem('wpepe.memeMade', '1');
    } catch { /* ignore */ }
  };
  const random = () => {
    const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setTop(p[0]);
    setBottom(p[1]);
    setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
    setBg(Object.keys(BACKGROUNDS)[Math.floor(Math.random() * 5)]);
    setSticker(STICKERS[1 + Math.floor(Math.random() * (STICKERS.length - 1))]);
  };

  return (
    <div className="meme-maker">
      <div ref={frogRef} className="hidden-frog" aria-hidden="true">
        <Frog mood={mood} size={300} />
      </div>
      <canvas ref={canvasRef} width={600} height={600} className="meme-canvas" />
      <div className="meme-controls">
        <label>Mood</label>
        <div className="seg">
          {MOODS.map((m) => (
            <button key={m} className={mood === m ? 'on' : ''} onClick={() => setMood(m)}>{m}</button>
          ))}
        </div>
        <label>Background</label>
        <div className="seg">
          {Object.keys(BACKGROUNDS).map((b) => (
            <button key={b} className={bg === b ? 'on' : ''} onClick={() => setBg(b)}>{b}</button>
          ))}
        </div>
        <label>Sticker</label>
        <div className="seg">
          {STICKERS.map((s) => (
            <button key={s || 'none'} className={sticker === s ? 'on' : ''} onClick={() => setSticker(s)}>{s || '∅'}</button>
          ))}
        </div>
        <label>Top text</label>
        <input value={top} maxLength={60} onChange={(e) => setTop(e.target.value)} />
        <label>Bottom text</label>
        <input value={bottom} maxLength={60} onChange={(e) => setBottom(e.target.value)} />
        <div className="meme-actions">
          <button className="meme-btn" onClick={random}>🎲 Random</button>
          <button className="meme-btn primary" onClick={download}>⬇ Download PNG</button>
        </div>
      </div>
    </div>
  );
}
