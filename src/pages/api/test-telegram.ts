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

  const isSuccess = await sendTelegramMessage(testMessage);

  if (isSuccess) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Đã gửi tin nhắn thử nghiệm thành công tới Telegram của bạn!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } else {
    return new Response(JSON.stringify({
      success: false,
      message: 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại Bot Token và Chat ID, đồng thời đảm bảo bạn đã bấm "Start" với Bot trên Telegram!'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
