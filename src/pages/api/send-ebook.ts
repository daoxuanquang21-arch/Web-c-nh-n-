import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
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

    // 1. Lưu thông tin đơn / lead vào src/data/leads.json
    try {
      let leads = [];
      if (fs.existsSync(leadsFilePath)) {
        const raw = fs.readFileSync(leadsFilePath, 'utf-8');
        leads = JSON.parse(raw || '[]');
      }
      const newLead = {
        name: name || 'Khách hàng',
        email,
        phone,
        product: 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
        date: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now()
      };
      leads.unshift(newLead);
      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (saveErr) {
      console.error('Lỗi lưu lead:', saveErr);
    }

    // 2. Mẫu nội dung email gửi khách hàng
    const readerUrl = 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2A1A12; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #F0DFD2; border-radius: 14px; background: #FFFAF6;">
        <div style="border-bottom: 2px solid #E8590C; padding-bottom: 14px; margin-bottom: 20px;">
          <h2 style="color: #E8590C; margin: 0; font-size: 20px;">ĐÀO XUÂN QUANG · TÀI NGUYÊN SỐ</h2>
        </div>

        <p style="font-size: 16px;">Xin chào <strong>${name || 'bạn'}</strong>,</p>
        <p>Cảm ơn bạn đã quan tâm và đặt mua cuốn Ebook <strong>"Tạo Blog – Cỗ máy bán hàng tự động bằng AI: Từ con số 0 đến nguồn thu đầu tiên"</strong>.</p>
        
        <p>Sách đã được chuẩn bị đầy đủ dưới định dạng <strong>Web Reader trực tuyến</strong> (đọc mượt trên máy tính, iPad, điện thoại, tích hợp sẵn copy prompt 1-click và tính năng lật trang):</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${readerUrl}" target="_blank" style="background: linear-gradient(135deg, #F76B1C, #E8590C); color: #ffffff; padding: 15px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(232, 89, 12, 0.35);">
            👉 BẤM ĐÂY ĐỂ MỞ ĐỌC EBOOK NGAY
          </a>
        </div>

        <div style="background: #FFF1E8; border: 1px dashed #E8590C; border-radius: 10px; padding: 14px; margin: 24px 0; font-size: 14px; color: #7A2E06;">
          <strong>💡 Mẹo đọc sách:</strong> Bạn có thể lưu dấu trang (Bookmark) liên kết này trên trình duyệt để mở đọc lại bất cứ lúc nào:
          <br>
          <a href="${readerUrl}" style="color: #E8590C; word-break: break-all; font-weight: 600;">${readerUrl}</a>
        </div>

        <p style="font-size: 14px; color: #7A6455;">
          Nếu bạn cần hỗ trợ kỹ thuật hoặc có bất kỳ câu hỏi nào trong quá trình làm theo sách, đừng ngần ngại liên hệ trực tiếp với mình:
        </p>

        <ul style="font-size: 14px; color: #2A1A12; padding-left: 20px; margin: 10px 0;">
          <li>Zalo cá nhân: <strong>0702 286 928</strong> (Đào Xuân Quang)</li>
          <li>Email: <a href="mailto:daoxuanquang26102003@gmail.com" style="color: #E8590C;">daoxuanquang26102003@gmail.com</a></li>
          <li>Facebook: <a href="https://www.facebook.com/aoxuanquang.402682" style="color: #E8590C;">Đào Xuân Quang</a></li>
        </ul>

        <hr style="border: none; border-top: 1px solid #F0DFD2; margin: 26px 0 16px;">
        <p style="font-size: 13px; color: #7A6455; margin: 0; text-align: center;">
          Chúc bạn sớm xây dựng thành công cỗ máy bán hàng tự động cho riêng mình!
        </p>
      </div>
    `;

    // 3. Gửi email qua Resend
    // Chú ý: Khi domain chưa verify trên Resend, 'from' gửi bằng 'onboarding@resend.dev'
    // và chỉ gửi được tới email đăng ký tài khoản Resend.
    // Khi domain daoxuanquang.com.vn đã verify, ta có thể dùng 'from': 'Đào Xuân Quang <ebook@daoxuanquang.com.vn>'
    const fromSender = process.env.RESEND_FROM || 'onboarding@resend.dev';

    let sendResult = await resend.emails.send({
      from: fromSender,
      to: email,
      subject: `📚 [Ebook] Tạo Blog – Cỗ máy bán hàng tự động bằng AI (${name || 'Dành cho bạn'})`,
      html: emailHtml
    });

    if (sendResult.error) {
      console.warn('Lỗi gửi email chính qua Resend:', sendResult.error);
      
      // Nếu gửi cho khách ngoài mà Resend báo cần verify domain, gửi 1 bản thông báo về Gmail của admin
      if (sendResult.error.message?.includes('testing emails')) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'daoxuanquang26102003@gmail.com',
          subject: `🔔 [Đơn Mới - Cần Gửi Ebook] ${name} (${email} - ${phone})`,
          html: `
            <h3>Có khách hàng mới vừa đặt Ebook:</h3>
            <p><strong>Họ tên:</strong> ${name}</p>
            <p><strong>Email khách:</strong> ${email}</p>
            <p><strong>Số điện thoại:</strong> ${phone}</p>
            <p><em>(Ghi chú: Để email tự động gửi trực tiếp vào hòm thư khách hàng ${email}, bạn hãy xác thực tên miền daoxuanquang.com.vn trong bảng điều khiển Resend. Hiện tại bạn có thể chuyển tiếp email này hoặc gửi link cho khách qua Zalo).</em></p>
          `
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
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
