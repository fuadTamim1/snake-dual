import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import DPad from '../components/DPad';

export default function ControllerPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [color, setColor]           = useState('#00ff88');
  const [lastDir, setLastDir]       = useState('');
  const [roundOver, setRoundOver]   = useState(null);  // { roundWinnerName, round, totalRounds }
  const [gameOver, setGameOver]     = useState(false);
  const [winner, setWinner]         = useState('');

  useEffect(() => {
    const name = sessionStorage.getItem('playerName') || 'Player';
    const col  = sessionStorage.getItem('color') || '#00ff88';
    setPlayerName(name);
    setColor(col);

    const socket = getSocket();

    socket.on('round:over', (data) => {
      setRoundOver(data);
    });

    socket.on('game:countdown', () => {
      // Next round is starting — dismiss round-over overlay
      setRoundOver(null);
    });

    socket.on('game:over', ({ winnerName }) => {
      setRoundOver(null);
      setGameOver(true);
      setWinner(winnerName || 'Nobody');
    });

    socket.on('game:reset', () => {
      router.replace('/waiting');
    });

    const noScroll = (e) => e.preventDefault();
    document.body.addEventListener('touchmove', noScroll, { passive: false });

    return () => {
      socket.off('round:over');
      socket.off('game:countdown');
      socket.off('game:over');
      socket.off('game:reset');
      document.body.removeEventListener('touchmove', noScroll);
    };
  }, []);

  const handleDirection = useCallback((dir) => {
    setLastDir(dir);
    const socket = getSocket();
    socket.emit('player:input', { direction: dir });
  }, []);

  // ── Final game over ──────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <>
        <Head>
          <title>Game Over — Snake Duel</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </Head>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          height:'100vh', gap:'20px', textAlign:'center', padding:'24px' }}>
          <div style={{ fontSize:'48px', color:'#ffff00' }}>GAME OVER</div>
          <div style={{ fontSize:'28px', color:'#00ff88' }}>{winner ? `${winner} Wins!` : 'DRAW!'}</div>
          <div style={{ fontSize:'16px', color:'#666', marginTop:'16px' }}>Waiting for next game...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Controller — Snake Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'space-between', height:'100vh', padding:'20px 0 40px', background:'#000', position:'relative' }}>

        {/* Header */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'22px', color: color }}>{playerName}</div>
          <div style={{ fontSize:'13px', color:'#444', marginTop:'4px' }}>{lastDir || 'READY'}</div>
        </div>

        {/* D-Pad */}
        <DPad onDirection={handleDirection} playerColor={color} />

        <div style={{ fontSize:'12px', color:'#333' }}>Snake Duel</div>

        {/* Round over overlay */}
        {roundOver && (
          <div style={{
            position:'absolute', inset:0, background:'rgba(0,0,0,0.88)',
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:'16px', padding:'24px', textAlign:'center',
          }}>
            <div style={{ fontSize:'16px', color:'#666' }}>
              ROUND {roundOver.round} / {roundOver.totalRounds}
            </div>
            <div style={{ fontSize:'36px', color: roundOver.roundWinnerName ? '#00ff88' : '#ffff00' }}>
              {roundOver.roundWinnerName ? `${roundOver.roundWinnerName} wins!` : 'DRAW!'}
            </div>
            <div style={{ fontSize:'14px', color:'#444', marginTop:'8px' }}>
              Next round starting...
            </div>
          </div>
        )}
      </div>
    </>
  );
}


export default function ControllerPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [color, setColor]           = useState('#00ff88');
  const [lastDir, setLastDir]       = useState('');
  const [gameOver, setGameOver]     = useState(false);
  const [winner, setWinner]         = useState('');

  useEffect(() => {
    const name = sessionStorage.getItem('playerName') || 'Player';
    const col  = sessionStorage.getItem('color') || '#00ff88';
    setPlayerName(name);
    setColor(col);

    const socket = getSocket();

    socket.on('game:over', ({ winnerName }) => {
      setGameOver(true);
      setWinner(winnerName || 'Nobody');
    });

    socket.on('game:reset', () => {
      router.replace('/waiting');
    });

    // Prevent page scroll on touch
    const noScroll = (e) => e.preventDefault();
    document.body.addEventListener('touchmove', noScroll, { passive: false });

    return () => {
      socket.off('game:over');
      socket.off('game:reset');
      document.body.removeEventListener('touchmove', noScroll);
    };
  }, []);

  const handleDirection = useCallback((dir) => {
    setLastDir(dir);
    const socket = getSocket();
    socket.emit('player:input', { direction: dir });
  }, []);

  if (gameOver) {
    return (
      <>
        <Head>
          <title>Game Over — Snake Duel</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        </Head>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '20px',
          textAlign: 'center',
          padding: '24px',
        }}>
          <div style={{ fontSize: '48px', color: '#ffff00' }}>GAME OVER</div>
          <div style={{ fontSize: '28px', color: '#00ff88' }}>{winner} Wins!</div>
          <div style={{ fontSize: '16px', color: '#666', marginTop: '16px' }}>Waiting for next round...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Controller — Snake Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100vh',
        padding: '20px 0 40px',
        background: '#000',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', color: color }}>{playerName}</div>
          <div style={{ fontSize: '13px', color: '#444', marginTop: '4px' }}>
            {lastDir || 'READY'}
          </div>
        </div>

        {/* D-Pad */}
        <DPad onDirection={handleDirection} playerColor={color} />

        <div style={{ fontSize: '12px', color: '#333' }}>Snake Duel</div>
      </div>
    </>
  );
}
