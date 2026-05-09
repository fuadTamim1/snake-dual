#!/usr/bin/env node
// scripts/setup.js — write server/.env for the target environment
//
// Usage:
//   node scripts/setup.js --local    auto-detect LAN IP, write server/.env
//   node scripts/setup.js --vps      copy server/.env.vps → server/.env

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const SERVER_ENV = path.join(ROOT, 'server', '.env');

const mode = process.argv[2];

if (mode === '--local') {
  setupLocal();
} else if (mode === '--vps') {
  setupVps();
} else {
  console.error('Usage: node scripts/setup.js --local | --vps');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────

function setupLocal() {
  const ip = getLocalIP();
  if (!ip) {
    console.error('Could not detect a LAN IP address. Make sure you are connected to WiFi.');
    process.exit(1);
  }

  const template = fs.readFileSync(path.join(ROOT, 'server', '.env.local.template'), 'utf8');
  const content  = template.replace(/\{LOCAL_IP\}/g, ip);
  fs.writeFileSync(SERVER_ENV, content, 'utf8');

  console.log(`✔  server/.env written for LOCAL mode`);
  console.log(`   LAN IP      : ${ip}`);
  console.log(`   Mobile URL  : http://${ip}:3001`);
  console.log(`   Host display: http://${ip}:3000  (after build + start)`);
  console.log(`   Dev host    : http://localhost:3002`);
}

function setupVps() {
  const src = path.join(ROOT, 'server', '.env.vps');
  if (!fs.existsSync(src)) {
    console.error('server/.env.vps not found.');
    process.exit(1);
  }
  fs.copyFileSync(src, SERVER_ENV);
  console.log('✔  server/.env written for VPS mode (copied from server/.env.vps)');
}

// ─────────────────────────────────────────────────────────────────────────────

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  // Prefer common WiFi/Ethernet interface names; skip loopback and virtual adapters
  const preferred = ['Wi-Fi', 'en0', 'en1', 'eth0', 'wlan0'];

  // Try preferred interfaces first
  for (const name of preferred) {
    const ip = pickIPv4(ifaces[name]);
    if (ip) return ip;
  }

  // Fallback: first non-internal, non-169.254.x.x IPv4
  for (const [, addrs] of Object.entries(ifaces)) {
    const ip = pickIPv4(addrs);
    if (ip) return ip;
  }

  return null;
}

function pickIPv4(addrs) {
  if (!addrs) return null;
  for (const addr of addrs) {
    if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.254.')) {
      return addr.address;
    }
  }
  return null;
}
