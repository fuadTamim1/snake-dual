// DPad — 4 large directional buttons

import { useCallback } from 'react';

const BTN = {
  position: 'absolute',
  background: 'rgba(255,255,255,0.08)',
  border: '2px solid rgba(255,255,255,0.15)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  color: '#fff',
  cursor: 'pointer',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  transition: 'background 0.07s',
};

const ACTIVE_BG = 'rgba(0,255,136,0.35)';
const SIZE = 90; // px

export default function DPad({ onDirection, playerColor = '#00ff88' }) {
  const press = useCallback((dir) => (e) => {
    e.preventDefault();
    onDirection(dir);
    // Visual feedback via vibration
    if (navigator.vibrate) navigator.vibrate(30);
  }, [onDirection]);

  return (
    <div style={{ position: 'relative', width: SIZE * 3, height: SIZE * 3 }}>
      {/* UP */}
      <button
        style={{ ...BTN, width: SIZE, height: SIZE, top: 0, left: SIZE }}
        onTouchStart={press('UP')}
        onMouseDown={press('UP')}
      >▲</button>

      {/* LEFT */}
      <button
        style={{ ...BTN, width: SIZE, height: SIZE, top: SIZE, left: 0 }}
        onTouchStart={press('LEFT')}
        onMouseDown={press('LEFT')}
      >◀</button>

      {/* CENTER (decorative) */}
      <div style={{
        position: 'absolute',
        width: SIZE,
        height: SIZE,
        top: SIZE,
        left: SIZE,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '50%',
        border: `2px solid ${playerColor}44`,
      }} />

      {/* RIGHT */}
      <button
        style={{ ...BTN, width: SIZE, height: SIZE, top: SIZE, left: SIZE * 2 }}
        onTouchStart={press('RIGHT')}
        onMouseDown={press('RIGHT')}
      >▶</button>

      {/* DOWN */}
      <button
        style={{ ...BTN, width: SIZE, height: SIZE, top: SIZE * 2, left: SIZE }}
        onTouchStart={press('DOWN')}
        onMouseDown={press('DOWN')}
      >▼</button>
    </div>
  );
}
