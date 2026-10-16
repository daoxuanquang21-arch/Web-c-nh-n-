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

const FALLBACK_BOT_TOKEN = '8770157034:AAF-sLPCKgyZg24DTM-dDC2M8T90GaPUiYc';
const FALLBACK_CHAT_ID = '5689167243';

/**
 * Gửi tin nhắn qua Telegram Bot API (sử dụng định dạng HTML)
 */
export async function sendTelegramMessage(htmlMessage: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || FALLBACK_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || FALLBACK_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('[Telegram] Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID. Bỏ qua gửi thông báo.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] Lỗi gửi tin nhắn Telegram:', result.description);
      return false;
    }
    console.log('[Telegram] Gửi thông báo Telegram thành công!');
    return true;
  } catch (error) {
    console.error('[Telegram] Ngoại lệ khi gọi Telegram API:', error);
    return false;
  }
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
