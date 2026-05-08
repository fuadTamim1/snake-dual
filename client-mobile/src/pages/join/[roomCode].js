import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

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
  title: { fontSize: '28px', color: '#00ff88' },
  sub:   { fontSize: '16px', color: '#888' },
  error: { color: '#ff4466', fontSize: '16px' },
  code:  { fontSize: '48px', color: '#fff', letterSpacing: '8px' },
};

export default function JoinPage() {
  const router = useRouter();
  const { roomCode, name } = router.query;
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomCode) return;       // wait for router to hydrate
    const playerName = name || 'Player';
    const socket = getSocket();

    function connect() {
      setStatus('Joining room...');
      socket.emit('player:join', { roomCode, playerName });
    }

    socket.on('connect', connect);
    socket.on('player:joined:self', ({ slotIndex, color }) => {
      // Store slot info in sessionStorage for controller page
      sessionStorage.setItem('slotIndex', String(slotIndex));
      sessionStorage.setItem('color', color);
      sessionStorage.setItem('playerName', playerName);
      sessionStorage.setItem('roomCode', roomCode);
      router.replace('/waiting');
    });
    socket.on('error:join', ({ message }) => {
      setError(message);
      setStatus('');
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      connect();
    }

    return () => {
      socket.off('connect', connect);
      socket.off('player:joined:self');
      socket.off('error:join');
    };
  }, [roomCode, name]);

  return (
    <>
      <Head>
        <title>Joining — Snake Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div style={styles.page}>
        <div style={styles.title}>SNAKE DUEL</div>
        <div style={styles.code}>{roomCode || '...'}</div>
        {status && <div style={styles.sub}>{status}</div>}
        {error  && <div style={styles.error}>{error}</div>}
        {error  && (
          <button
            onClick={() => router.push('/')}
            style={{ padding: '14px 28px', fontSize: '16px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Go Back
          </button>
        )}
      </div>
    </>
  );
}
