import type { APIRoute } from 'astro';
import net from 'net';
import https from 'https';

export const prerender = false;

function checkTcp(host: string, port: number, timeout = 3000): Promise<{ ok: boolean; time?: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      const time = Date.now() - start;
      socket.destroy();
      resolve({ ok: true, time });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ ok: false, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'TIMEOUT' });
    });
  });
}

function httpsGet(urlStr: string, family?: number): Promise<{ statusCode?: number; data?: string; error?: string }> {
  return new Promise((resolve) => {
    try {
      const req = https.get(urlStr, { family, timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data: body }));
      });
      req.on('error', (e) => resolve({ error: e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'TIMEOUT' });
      });
    } catch (err: any) {
      resolve({ error: err.message });
    }
  });
}

export const GET: APIRoute = async () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8770157034:AAF-sLPCKgyZg24DTM-dDC2M8T90GaPUiYc';
  const chatId = process.env.TELEGRAM_CHAT_ID || '5689167243';

  // 1. Kiểm tra IP VPS
  const ipCheck = await httpsGet('https://api.ipify.org?format=json');

  // 2. Kiểm tra TCP tới các IP Telegram
  const tcpTelegram1 = await checkTcp('149.154.166.110', 443, 3000);
  const tcpTelegram2 = await checkTcp('149.154.167.220', 443, 3000);
  const tcpTelegram3 = await checkTcp('91.108.56.160', 443, 3000);
  const tcpGoogle = await checkTcp('1.1.1.1', 443, 3000);

  // 3. Thử gọi Telegram qua family 4
  const tgFamily4 = await httpsGet(`https://api.telegram.org/bot${botToken}/getMe`, 4);

  return new Response(JSON.stringify({
    serverIpInfo: ipCheck,
    tcpTests: {
      '149.154.166.110:443': tcpTelegram1,
      '149.154.167.220:443': tcpTelegram2,
      '91.108.56.160:443': tcpTelegram3,
      '1.1.1.1:443 (Cloudflare)': tcpGoogle
    },
    telegramHttpsFamily4: tgFamily4
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
