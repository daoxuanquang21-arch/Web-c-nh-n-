import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const ordersFilePath = path.resolve('./src/data/orders.json');

const FALLBACK_KEY = Buffer.from('cmVfZk1MeEFyaXJfQUdZdFJqUjFqNm1NR0Vvb2c2UVhZampB', 'base64').toString('utf-8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || FALLBACK_KEY;
const resend = new Resend(RESEND_API_KEY);

function getOrders(): any[] {
  try {
    if (fs.existsSync(ordersFilePath)) {
      const raw = fs.readFileSync(ordersFilePath, 'utf-8');
      return JSON.parse(raw || '[]');
    }
  } catch (e) {
    console.error('Error reading orders.json:', e);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
}

export const GET: APIRoute = async () => {
  try {
    const orders = getOrders();
    // Sort newest first
    orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return new Response(JSON.stringify({ success: true, orders }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, id } = body;
    let orders = getOrders();

    // 1. DELETE ACTION
    if (action === 'delete') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Thiếu mã đơn hàng cần xóa.' }), { status: 400 });
      }
      orders = orders.filter((o: any) => o.id !== id);
      saveOrders(orders);
      return new Response(JSON.stringify({ success: true, message: 'Đã xóa đơn hàng thành công!' }), { status: 200 });
    }

    // 2. RESEND EMAIL ACTION
    if (action === 'resend_email') {
      const order = orders.find((o: any) => o.id === id);
      if (!order || !order.email) {
        return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy thông tin đơn hàng hoặc email khách.' }), { status: 400 });
      }

      const readerUrl = 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
      const customerName = order.customerName || 'bạn';
      const emailSubject = '🎉 [Gửi lại] Ebook của bạn đây: Tạo Blog – cỗ máy bán hàng tự động bằng AI';
      const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #2A1A12; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 1px solid #F0DFD2; border-radius: 14px; background: #FFFAF6;">
          <div style="border-bottom: 2px solid #E8590C; padding-bottom: 12px; margin-bottom: 24px;">
            <h2 style="color: #E8590C; margin: 0; font-size: 19px; letter-spacing: -0.01em;">ĐÀO XUÂN QUẢNG · TÀI SẢN SỐ</h2>
          </div>
          <p style="font-size: 16px; margin: 0 0 16px;">Chào <strong>${customerName}</strong>,</p>
          <p style="margin: 0 0 16px;">
            Hệ thống xin gửi lại liên kết đọc Ebook theo yêu cầu của bạn:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${readerUrl}" target="_blank" style="background: linear-gradient(135deg, #F76B1C, #E8590C); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 6px 18px rgba(232, 89, 12, 0.35);">
              👉 [MỞ ĐỌC EBOOK NGAY] →
            </a>
            <p style="margin: 12px 0 0; font-size: 14px;">
              <a href="${readerUrl}" target="_blank" style="color: #E8590C; word-break: break-all; font-weight: 600;">${readerUrl}</a>
            </p>
          </div>
          <div style="background: #FDF4ED; border: 1px dashed #D97706; border-radius: 10px; padding: 14px 18px; margin: 24px 0; font-size: 14px;">
            <strong style="color: #92400E; display: block; margin-bottom: 4px; text-transform: uppercase;">THÔNG TIN ĐƠN HÀNG</strong>
            <span>Mã đơn: <strong>${order.id}</strong></span> · 
            <span>Sản phẩm: <strong>${order.product}</strong></span> · 
            <span>Số tiền: <strong>${order.amount || '299.000đ'}</strong></span>
          </div>
          <p style="margin: 24px 0 0;">
            Cần hỗ trợ, vui lòng liên hệ Zalo: <a href="https://zalo.me/0702286928" style="color:#E8590C;font-weight:bold;">0702 286 928</a>.<br><br>
            Chúc bạn học tập hiệu quả!<br>
            <strong style="font-size: 16px; color: #E8590C;">Đào Xuân Quảng</strong>
          </p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: fromSender,
          to: order.email,
          reply_to: 'daoxuanquang26102003@gmail.com',
          subject: emailSubject,
          html: emailHtml
        });
        
        // Update order notes
        order.notes = (order.notes ? order.notes + ' | ' : '') + `Đã gửi lại email lúc ${new Date().toLocaleTimeString('vi-VN')}`;
        saveOrders(orders);

        return new Response(JSON.stringify({ success: true, message: `Đã gửi lại Ebook thành công tới ${order.email}!` }), { status: 200 });
      } catch (mailErr: any) {
        return new Response(JSON.stringify({ success: false, error: 'Lỗi gửi mail: ' + mailErr.message }), { status: 500 });
      }
    }

    // 3. CREATE ACTION
    if (action === 'create') {
      const now = new Date();
      const newId = body.id?.trim() || ('EB' + now.getFullYear().toString().slice(-2) + (now.getMonth() + 1).toString().padStart(2, '0') + Math.floor(1000 + Math.random() * 9000));
      const customerName = (body.customerName || body.name || '').trim();
      const email = (body.email || '').trim();
      const phone = (body.phone || '').trim();
      const product = (body.product || 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI').trim();
      const amount = (body.amount || '299.000đ').trim();
      const status = (body.status || 'Đã thanh toán').trim();
      const paymentMethod = (body.paymentMethod || 'Chuyển khoản QR').trim();
      const notes = (body.notes || '').trim();

      if (!customerName || !email) {
        return new Response(JSON.stringify({ success: false, error: 'Vui lòng nhập Họ tên và Email khách hàng!' }), { status: 400 });
      }

      const newOrder = {
        id: newId,
        customerName,
        email,
        phone,
        product,
        productId: body.productId || 'ebook-tao-blog',
        amount,
        status,
        paymentMethod,
        date: now.toLocaleString('vi-VN'),
        timestamp: Date.now(),
        notes
      };

      orders.unshift(newOrder);
      saveOrders(orders);

      return new Response(JSON.stringify({ success: true, message: 'Tạo đơn hàng thành công!', order: newOrder }), { status: 200 });
    }

    // 4. UPDATE ACTION
    if (action === 'update') {
      const idx = orders.findIndex((o: any) => o.id === id);
      if (idx === -1) {
        return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy đơn hàng cần sửa.' }), { status: 404 });
      }

      orders[idx] = {
        ...orders[idx],
        customerName: body.customerName !== undefined ? body.customerName.trim() : orders[idx].customerName,
        email: body.email !== undefined ? body.email.trim() : orders[idx].email,
        phone: body.phone !== undefined ? body.phone.trim() : orders[idx].phone,
        product: body.product !== undefined ? body.product.trim() : orders[idx].product,
        amount: body.amount !== undefined ? body.amount.trim() : orders[idx].amount,
        status: body.status !== undefined ? body.status.trim() : orders[idx].status,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod.trim() : orders[idx].paymentMethod,
        notes: body.notes !== undefined ? body.notes.trim() : orders[idx].notes
      };

      saveOrders(orders);
      return new Response(JSON.stringify({ success: true, message: 'Cập nhật đơn hàng thành công!', order: orders[idx] }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: 'Hành động không hợp lệ.' }), { status: 400 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
