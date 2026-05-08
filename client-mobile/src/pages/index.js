import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '24px',
    gap: '24px',
  },
  title: {
    fontSize: '36px',
    color: '#00ff88',
    letterSpacing: '4px',
    marginBottom: '8px',
  },
  sub: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: '320px',
    padding: '16px',
    fontSize: '24px',
    textAlign: 'center',
    background: '#111',
    border: '2px solid #333',
    borderRadius: '8px',
    color: '#fff',
    letterSpacing: '4px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  btn: {
    width: '100%',
    maxWidth: '320px',
    padding: '18px',
    fontSize: '20px',
    background: '#00ff88',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
  error: {
    color: '#ff4466',
    fontSize: '14px',
  },
};

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleJoin() {
    const trimName = name.trim();
    const trimCode = code.trim().toUpperCase();
    if (!trimName) { setError('Enter your name.'); return; }
    if (trimCode.length !== 4) { setError('Room code must be 4 characters.'); return; }
    setError('');
    router.push({
      pathname: `/join/${trimCode}`,
      query: { name: trimName },
    });
  }

  return (
    <>
      <Head>
        <title>Snake Duel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <div style={styles.page}>
        <div>
          <div style={styles.title}>SNAKE DUEL</div>
          <div style={styles.sub}>Enter your name and room code to join</div>
        </div>

        <input
          style={styles.input}
          type="text"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="off"
        />

        <input
          style={styles.input}
          type="text"
          placeholder="ROOM CODE"
          maxLength={4}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.btn} onClick={handleJoin}>JOIN GAME</button>
      </div>
    </>
  );
}
