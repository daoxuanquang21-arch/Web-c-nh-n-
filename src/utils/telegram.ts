/**
 * Telegram Notification Service
 * Tự động gửi thông báo về Telegram khi có đơn hàng mới hoặc thanh toán thành công
 */

interface PendingOrderNotification {
  orderId: string;
  customerName: string;
  email: string;
  phone?: string;
  product: string;
  amount: string | number;
  date?: string;
}

interface PaidOrderNotification {
  orderId: string;
  customerName: string;
  email: string;
  phone?: string;
  product: string;
  amount: string | number;
  gateway?: string;
  transactionId?: string;
  paidAt?: string;
  isAutoSentMail?: boolean;
}

import https from 'https';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const FALLBACK_BOT_TOKEN = '8770157034:AAF-sLPCKgyZg24DTM-dDC2M8T90GaPUiYc';
const FALLBACK_CHAT_ID = '5689167243';

/**
 * Gửi tin nhắn qua Telegram Bot API (sử dụng IPv4 trực tiếp để tránh lỗi mạng IPv6 trên VPS)
 */
export async function sendTelegramMessage(htmlMessage: string): Promise<boolean> {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawChatId = process.env.TELEGRAM_CHAT_ID;

  const botToken = (rawToken && rawToken.trim()) ? rawToken.trim() : FALLBACK_BOT_TOKEN;
  const chatId = (rawChatId && rawChatId.trim()) ? rawChatId.trim() : FALLBACK_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID. Bỏ qua gửi thông báo.');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        family: 4, // Ép dùng IPv4 giải quyết triệt để lỗi ETIMEDOUT trên Linux
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.ok) {
              console.log('[Telegram] Gửi thông báo Telegram thành công!');
              resolve(true);
            } else {
              console.error('[Telegram] Telegram API báo lỗi:', data.description);
              resolve(false);
            }
          } catch (_) {
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Telegram] Ngoại lệ khi gọi Telegram API:', err.message);
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('[Telegram] Timeout khi gửi tin nhắn Telegram');
        resolve(false);
      });

      req.write(payload);
      req.end();
    } catch (error) {
      console.error('[Telegram] Lỗi không xác định:', error);
      resolve(false);
    }
  });
}

/**
 * THÔNG BÁO 1: Khách vừa điền thông tin đặt mua Ebook (Chờ thanh toán)
 */
export async function notifyTelegramNewOrder(data: PendingOrderNotification): Promise<boolean> {
  const formattedAmount = typeof data.amount === 'number' 
    ? `${data.amount.toLocaleString('vi-VN')}đ` 
    : data.amount;

  const nowStr = data.date || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const phoneDisplay = data.phone ? data.phone : '<i>(Chưa cung cấp)</i>';

  const message = `
🔔 <b>CÓ ĐƠN HÀNG MỚI (CHỜ THANH TOÁN)</b>
━━━━━━━━━━━━━━━━━━
📦 <b>Sản phẩm:</b> ${escapeHtml(data.product)}
🔖 <b>Mã đơn:</b> <code>${escapeHtml(data.orderId)}</code>
💰 <b>Số tiền:</b> <b>${formattedAmount}</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Khách hàng:</b> ${escapeHtml(data.customerName)}
📞 <b>Số điện thoại:</b> ${escapeHtml(phoneDisplay)}
✉️ <b>Email:</b> ${escapeHtml(data.email)}
⏰ <b>Thời gian:</b> ${nowStr}
━━━━━━━━━━━━━━━━━━
💡 <i>Khách hàng vừa bấm Đặt mua và đang xem mã QR VietQR. Hãy theo dõi nếu sau 10-15p chưa thanh toán để liên hệ hỗ trợ kịp thời!</i>
`.trim();

  return sendTelegramMessage(message);
}

/**
 * THÔNG BÁO 2: Khách ĐÃ thanh toán thành công (Khớp qua SePay)
 */
export async function notifyTelegramPaymentSuccess(data: PaidOrderNotification): Promise<boolean> {
  const formattedAmount = typeof data.amount === 'number' 
    ? `${data.amount.toLocaleString('vi-VN')}đ` 
    : data.amount;

  const paidTime = data.paidAt || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const phoneDisplay = data.phone ? data.phone : '<i>(Chưa cung cấp)</i>';
  const mailStatus = data.isAutoSentMail !== false 
    ? '✅ Đã tự động gửi email giao Ebook' 
    : '⚠️ Chưa gửi được email (kiểm tra Resend)';

  const message = `
🎉 <b>TIỀN VỀ! ĐÃ THANH TOÁN THÀNH CÔNG</b> 💰
━━━━━━━━━━━━━━━━━━
📦 <b>Sản phẩm:</b> ${escapeHtml(data.product)}
🔖 <b>Mã đơn:</b> <code>${escapeHtml(data.orderId)}</code>
💵 <b>Số tiền thực nhận:</b> <b>+${formattedAmount}</b>
🏦 <b>Cổng thanh toán:</b> ${escapeHtml(data.gateway || 'MBBank (SePay)')}
🆔 <b>Mã giao dịch:</b> <code>${escapeHtml(data.transactionId || 'SePay Webhook')}</code>
━━━━━━━━━━━━━━━━━━
👤 <b>Khách hàng:</b> ${escapeHtml(data.customerName)}
📞 <b>Điện thoại:</b> ${escapeHtml(phoneDisplay)}
✉️ <b>Email:</b> ${escapeHtml(data.email)}
⏰ <b>Thời gian khớp:</b> ${paidTime}
━━━━━━━━━━━━━━━━━━
📬 <b>Trạng thái:</b> ${mailStatus}
`.trim();

  return sendTelegramMessage(message);
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
