import type { APIRoute } from 'astro';
import { sendTelegramMessage } from '../../utils/telegram';

export const prerender = false;

export const GET: APIRoute = async () => {


  const testMessage = `
🤖 <b>TEST THÔNG BÁO TELEGRAM THÀNH CÔNG!</b>
━━━━━━━━━━━━━━━━━━
Hệ thống website <b>Đào Xuân Quảng</b> đã kết nối thành công với Telegram của bạn.
Mỗi khi có:
1️⃣ Khách để lại thông tin (Chờ thanh toán)
2️⃣ Khách thanh toán thành công (SePay)
👉 Đều sẽ tự động báo ngay lập tức về đây!
⏰ <i>${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</i>
`.trim();

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8770157034:AAF-sLPCKgyZg24DTM-dDC2M8T90GaPUiYc';
  const chatId = process.env.TELEGRAM_CHAT_ID || '5689167243';

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await response.json();
    return new Response(JSON.stringify({
      success: data.ok,
      telegramResponse: data,
      botTokenUsed: botToken ? botToken.slice(0, 10) + '...' : null,
      chatIdUsed: chatId
    }), {
      status: data.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err: any) {
    let dnsResult = null;
    try {
      const dns = await import('dns/promises');
      dnsResult = await dns.lookup('api.telegram.org');
    } catch (e: any) {
      dnsResult = { error: e.message, code: e.code };
    }

    return new Response(JSON.stringify({
      success: false,
      errorName: err.name,
      errorMessage: err.message,
      errorCause: err.cause ? (err.cause.message || err.cause.code || String(err.cause)) : null,
      dnsLookup: dnsResult,
      botTokenUsed: botToken ? botToken.slice(0, 10) + '...' : null,
      chatIdUsed: chatId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
