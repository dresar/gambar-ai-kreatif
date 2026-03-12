import kill from 'kill-port';

const PORTS = [5000, 8080, 8081];
for (const port of PORTS) {
  try {
    await kill(port);
    console.log('Port', port, 'freed');
  } catch (_) {}
}
