import net from 'node:net';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'pglite-server';
import fs from 'node:fs';
import path from 'node:path';

function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

const isRunning = await isPortOpen(5432, '127.0.0.1');
if (isRunning) {
  console.log('PostgreSQL is already running on port 5432.');
} else {
  const dataDir = path.join(process.cwd(), '.data', 'pglite');
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  const server = createServer(pglite);
  server.listen(5432, '127.0.0.1', () => {
    console.log('PostgreSQL server listening at postgresql://postgres:postgres@127.0.0.1:5432/app_db');
  });
}
