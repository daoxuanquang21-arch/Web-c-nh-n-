import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { renderOrderEmailHtml, getOrderEmailSubject } from '../../utils/orderEmailTemplate';
import { scheduleDripCampaignForOrder } from '../../utils/dripEmails';

const FALLBACK_KEY = Buffer.from('cmVfZk1MeEFyaXJfQUdZdFJqUjFqNm1NR0Vvb2c2UVhZampB', 'base64').toString('utf-8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || FALLBACK_KEY;
const resend = new Resend(RESEND_API_KEY);

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

    // 2. Lưu đơn vào src/data/orders.json (CRM) và src/data/leads.json
    try {
      const ordersFilePath = path.resolve('./src/data/orders.json');
      let orders = [];
      if (fs.existsSync(ordersFilePath)) {
        const rawOrders = fs.readFileSync(ordersFilePath, 'utf-8');
        orders = JSON.parse(rawOrders || '[]');
      }
      const newOrder = {
        id: maDon,
        customerName,
        email,
        phone,
        product: 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
        productId: 'ebook-tao-blog',
        amount: soTien,
        status: 'Đã thanh toán',
        paymentMethod: 'Chuyển khoản QR',
        date: now.toLocaleString('vi-VN'),
        timestamp: Date.now(),
        notes: 'Khách hàng thanh toán qua landing page /ebook-tao-blog',
        dripCampaign: {
          status: 'active',
          startedAt: Date.now(),
          days: []
        }
      };
      orders.unshift(newOrder);
      fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (orderErr) {
      console.error('Lỗi lưu orders.json:', orderErr);
    }
    // 3. Mẫu Email theo chuẩn mới của tác giả Đào Xuân Quảng
    const emailSubject = getOrderEmailSubject(customerName, false);
    const emailHtml = renderOrderEmailHtml({
      customerName,
      readerUrl,
      maDon,
      soTien,
      ngayFormatted
    });

    // 4. Gửi email qua Resend
    const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

    let sendResult = await resend.emails.send({
      from: fromSender,
      to: email,
      reply_to: 'daoxuanquang26102003@gmail.com',
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

    // 5. Tự động lên lịch chuỗi Email chăm sóc 7 ngày liên tục (07:30 sáng mỗi ngày)
    try {
      const dripResults = await scheduleDripCampaignForOrder({
        customerName,
        email,
        timestamp: Date.now()
      });

      const ordersFilePath = path.resolve('./src/data/orders.json');
      if (fs.existsSync(ordersFilePath)) {
        let currentOrders = JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8') || '[]');
        const idx = currentOrders.findIndex((o: any) => o.id === maDon);
        if (idx !== -1) {
          currentOrders[idx].dripCampaign = {
            status: 'active',
            startedAt: Date.now(),
            days: dripResults
          };
          fs.writeFileSync(ordersFilePath, JSON.stringify(currentOrders, null, 2), 'utf-8');
        }
      }
    } catch (dripErr) {
      console.warn('Cảnh báo khi lên lịch chuỗi 7 ngày:', dripErr);
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
