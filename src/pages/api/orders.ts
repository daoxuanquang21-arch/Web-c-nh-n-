import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { renderOrderEmailHtml, getOrderEmailSubject } from '../../utils/orderEmailTemplate';

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
      const emailSubject = getOrderEmailSubject(customerName, true);
      const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

      const emailHtml = renderOrderEmailHtml({
        customerName,
        readerUrl,
        maDon: order.id,
        soTien: order.amount || '299.000đ',
        ngayFormatted: order.date || new Date().toLocaleDateString('vi-VN')
      });

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
