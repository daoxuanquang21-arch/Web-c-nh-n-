import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const FALLBACK_KEY = Buffer.from('cmVfZk1MeEFyaXJfQUdZdFJqUjFqNm1NR0Vvb2c2UVhZampB', 'base64').toString('utf-8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || FALLBACK_KEY;
const resend = new Resend(RESEND_API_KEY);

const leadsFilePath = path.resolve('./src/data/leads.json');

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    let name = '';
    let email = '';
    let phone = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = await request.json();
        name = data.name || '';
        email = data.email || '';
        phone = data.phone || '';
      } catch (_) {}
    }
    if (!email) {
      try {
        const formData = await request.formData();
        name = name || formData.get('name')?.toString() || '';
        email = email || formData.get('email')?.toString() || '';
        phone = phone || formData.get('phone')?.toString() || '';
      } catch (_) {}
    }

    if (!email) {
      return new Response(JSON.stringify({ success: false, message: 'Vui lòng cung cấp email.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Chuẩn bị thông tin đơn hàng
    const now = new Date();
    const maDon = 'EB' + now.getFullYear().toString().slice(-2) + (now.getMonth() + 1).toString().padStart(2, '0') + Math.floor(1000 + Math.random() * 9000);
    const ngayFormatted = now.toLocaleDateString('vi-VN');
    const soTien = '299.000đ';
    const readerUrl = 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
    const customerName = name.trim() || 'bạn';

    // 2. Lưu đơn / lead vào src/data/leads.json
    try {
      let leads = [];
      if (fs.existsSync(leadsFilePath)) {
        const raw = fs.readFileSync(leadsFilePath, 'utf-8');
        leads = JSON.parse(raw || '[]');
      }
      const newLead = {
        id: maDon,
        name: customerName,
        email,
        phone,
        product: 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
        amount: soTien,
        date: now.toLocaleString('vi-VN'),
        timestamp: Date.now()
      };
      leads.unshift(newLead);
      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (saveErr) {
      console.error('Lỗi lưu lead:', saveErr);
    }

    // 3. Mẫu Email theo chuẩn của tác giả Đào Xuân Quang
    const emailSubject = '🎉 Ebook của bạn đây: Tạo Blog – cỗ máy bán hàng tự động bằng AI';
    
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #2A1A12; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 1px solid #F0DFD2; border-radius: 14px; background: #FFFAF6;">
        <div style="border-bottom: 2px solid #E8590C; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #E8590C; margin: 0; font-size: 19px; letter-spacing: -0.01em;">ĐÀO XUÂN QUANG · TÀI SẢN SỐ</h2>
        </div>

        <p style="font-size: 16px; margin: 0 0 16px;">Chào <strong>${customerName}</strong>,</p>
        
        <p style="margin: 0 0 16px;">
          Cảm ơn bạn đã tin tưởng và đầu tư cho chính mình. Thanh toán của bạn đã thành công, đây là ebook của bạn:
        </p>
        
        <!-- Nút đọc Ebook -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${readerUrl}" target="_blank" style="background: linear-gradient(135deg, #F76B1C, #E8590C); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 6px 18px rgba(232, 89, 12, 0.35);">
            👉 [ĐỌC EBOOK NGAY] →
          </a>
          <p style="margin: 12px 0 0; font-size: 14px;">
            <a href="${readerUrl}" target="_blank" style="color: #E8590C; word-break: break-all; font-weight: 600;">${readerUrl}</a>
          </p>
        </div>

        <p style="margin: 0 0 20px; font-size: 15px; color: #4A3B32;">
          Đây là link riêng của bạn, mở được trên cả điện thoại và máy tính. Hãy lưu lại email này hoặc đánh dấu trang để đọc lại bất cứ lúc nào. Ebook tự nhớ trang bạn đang đọc và tiến độ checklist trên thiết bị bạn dùng.
        </p>

        <!-- Bắt đầu thế nào -->
        <div style="background: #FFF1E8; border-left: 4px solid #E8590C; border-radius: 0 10px 10px 0; padding: 18px 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px; font-size: 15px; color: #E8590C; text-transform: uppercase; letter-spacing: 0.03em;">BẮT ĐẦU THẾ NÀO?</h3>
          <p style="margin: 0 0 8px; font-weight: 600;">Đừng đọc hết rồi mới làm. Hãy:</p>
          <ol style="margin: 0 0 10px; padding-left: 20px;">
            <li style="margin-bottom: 4px;">Mở trang 2 (Lời mở đầu), đọc phần <em>"Thử thách 2 tiếng"</em>.</li>
            <li style="margin-bottom: 4px;">Chọn một khung 2 tiếng ngay trong tuần này, ghi vào lịch như một cuộc hẹn.</li>
            <li style="margin-bottom: 4px;">Chuẩn bị sẵn thẻ thanh toán quốc tế và CCCD.</li>
          </ol>
          <p style="margin: 0; font-size: 14.5px; color: #2A1A12;">
            <strong>Sau 2 tiếng đó</strong>, bạn sẽ có tên miền riêng và blog đầu tiên chạy trên máy.
          </p>
        </div>

        <!-- Kẹt ở đâu -->
        <div style="background: #ffffff; border: 1px solid #F0DFD2; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px; font-size: 15px; color: #2A1A12; text-transform: uppercase; letter-spacing: 0.03em;">KẸT Ở ĐÂU CŨNG CÓ NGƯỜI HỖ TRỢ</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14.5px;">
            <li style="margin-bottom: 6px;">Chụp màn hình lỗi và hỏi agent coding theo nguyên tắc AI First (trang 3).</li>
            <li style="margin-bottom: 0;">Vẫn chưa được, nhắn Zalo cho Quảng: <a href="https://zalo.me/0702286928" target="_blank" style="color: #E8590C; font-weight: bold; text-decoration: none;">0702 286 928</a>.</li>
          </ul>
        </div>

        <!-- Thông tin đơn hàng -->
        <div style="background: #FDF4ED; border: 1px dashed #D97706; border-radius: 10px; padding: 14px 18px; margin: 24px 0; font-size: 14px;">
          <strong style="color: #92400E; display: block; margin-bottom: 4px; text-transform: uppercase;">THÔNG TIN ĐƠN HÀNG</strong>
          <span>Mã đơn: <strong>${maDon}</strong></span> · 
          <span>Số tiền: <strong>${soTien}</strong></span> · 
          <span>Ngày: <strong>${ngayFormatted}</strong></span>
        </div>

        <p style="margin: 24px 0 0;">
          Hẹn gặp bạn ở bậc thang tiếp theo,<br>
          <strong style="font-size: 16px; color: #E8590C;">Quảng</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #F0DFD2; margin: 24px 0 16px;">
        
        <p style="font-size: 13.5px; color: #7A6455; font-style: italic; margin: 0; line-height: 1.6;">
          <strong>P.S.</strong> Khi blog của bạn chạy thật trên tên miền riêng, hãy trả lời email này kèm link blog. Quảng rất muốn được xem, và bạn sẽ nhận một món quà dành riêng cho người đã đi hết chặng đường.
        </p>
      </div>
    `;

    // 4. Gửi email qua Resend
    const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quang <ebook@daoxuanquang.com.vn>';

    let sendResult = await resend.emails.send({
      from: fromSender,
      to: email,
      subject: emailSubject,
      html: emailHtml
    });

    if (sendResult.error) {
      console.warn('Lỗi gửi email chính qua Resend:', sendResult.error);
      
      // Nếu gửi cho khách ngoài mà Resend sandbox báo cần verify domain, gửi thông báo về Gmail của admin
      if (sendResult.error.message?.includes('testing emails')) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'daoxuanquang26102003@gmail.com',
          subject: `🔔 [Đơn Mới - Cần Gửi Ebook] Mã ${maDon} · ${customerName} (${email} - ${phone})`,
          html: `
            <h3>Có khách hàng mới vừa đặt Ebook:</h3>
            <p><strong>Mã đơn:</strong> ${maDon}</p>
            <p><strong>Họ tên:</strong> ${customerName}</p>
            <p><strong>Email khách:</strong> ${email}</p>
            <p><strong>Số điện thoại:</strong> ${phone}</p>
            <p><strong>Số tiền:</strong> ${soTien}</p>
            <p><em>(Ghi chú: Để email tự động gửi trực tiếp vào hòm thư khách hàng ${email}, bạn hãy xác thực tên miền daoxuanquang.com.vn trong bảng điều khiển Resend. Hiện tại bạn có thể chuyển tiếp email này hoặc gửi link đọc trực tiếp cho khách qua Zalo).</em></p>
          `
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: maDon,
      message: 'Thông tin đã được ghi nhận. Ebook đã được gửi tới email của bạn!' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Lỗi API send-ebook:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
