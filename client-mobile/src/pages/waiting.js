import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '24px',
    gap: '20px',
    textAlign: 'center',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'inline-block',
    marginLeft: '8px',
  },
};

export default function WaitingPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [color, setColor] = useState('#00ff88');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const name  = sessionStorage.getItem('playerName') || 'Player';
    const col   = sessionStorage.getItem('color') || '#00ff88';
    setPlayerName(name);
    setColor(col);

    const socket = getSocket();

    socket.on('player:joined', ({ players: p }) => setPlayers(p));
    socket.on('game:countdown', () => router.replace('/controller'));

    return () => {
      socket.off('player:joined');
      socket.off('game:countdown');
    };
  }, []);

  return (
    <>
      <Head>
        <title>Waiting — Snake Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div style={styles.page}>
        <div style={{ fontSize: '28px', color: '#00ff88' }}>SNAKE DUEL</div>

        <div style={{ fontSize: '22px', color: '#fff' }}>
          {playerName}
          <span style={{ ...styles.dot, background: color }} />
        </div>

        <div style={{ fontSize: '16px', color: '#888' }}>Waiting for host to start...</div>

        <div style={{ marginTop: '24px', width: '100%', maxWidth: '320px' }}>
          {players.map((p, i) => (
            <div key={p.socketId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#111',
              borderRadius: '8px',
              marginBottom: '8px',
              borderLeft: `4px solid ${p.color}`,
            }}>
              <span style={{ color: p.color, fontSize: '14px' }}>P{i + 1}</span>
              <span style={{ color: '#fff', fontSize: '18px' }}>{p.name}</span>
              <span style={{ marginLeft: 'auto', color: '#00ff88', fontSize: '12px' }}>✓ READY</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '14px', color: '#444', marginTop: '16px' }}>
          {players.length}/2 players connected
        </div>
      </div>
    </>
  );
}
