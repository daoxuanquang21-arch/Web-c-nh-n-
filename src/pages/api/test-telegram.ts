import type { APIRoute } from 'astro';
import { sendTelegramMessage } from '../../utils/telegram';

export const prerender = false;

export const GET: APIRoute = async () => {
  const testMessage = `
🎉 <b>KÍCH HOẠT THÀNH CÔNG TỪ MÁY CHỦ VPS!</b> 🚀
━━━━━━━━━━━━━━━━━━
Xin chào anh <b>Anndy TOT</b>,
Máy chủ website <b>daoxuanquang.com.vn</b> (IP: 82.38.138.44) đã kết nối trực tiếp thành công với Telegram!

Từ bây giờ:
1️⃣ Có khách để lại thông tin (Chờ thanh toán)
2️⃣ Khách chuyển khoản thành công (SePay)
👉 Hệ thống sẽ tự động bắn thông báo ngay lập tức về đây!
⏰ <i>${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</i>
`.trim();

  const isSuccess = await sendTelegramMessage(testMessage);

  if (isSuccess) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Chúc mừng! Đã gửi tin nhắn thông báo thành công từ máy chủ VPS về Telegram của bạn!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } else {
    return new Response(JSON.stringify({
      success: false,
      message: 'Không thể gửi tin nhắn từ VPS. Vui lòng kiểm tra lại log.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
