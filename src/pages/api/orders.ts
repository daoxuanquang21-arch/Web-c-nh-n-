import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { renderOrderEmailHtml, getOrderEmailSubject } from '../../utils/orderEmailTemplate';
import { sendDripEmail, scheduleDripCampaignForOrder, DRIP_METADATA } from '../../utils/dripEmails';

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
    let orders = getOrders();
    let isDirty = false;
    orders.forEach((o: any) => {
      if (o.timestamp) {
        o.date = new Date(o.timestamp).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour12: false
        });
      }
      // Dọn dẹp ghi chú tạm thời "Đang chờ chuyển khoản..." nếu đơn đã được xác nhận thanh toán
      if ((o.status === 'Đã thanh toán' || o.status === 'Đã hoàn tất') && o.notes && o.notes.includes('Đang chờ chuyển khoản')) {
        const cleaned = o.notes
          .replace(/Đang chờ chuyển khoản[^\n|]*\s*\|\s*/gi, '')
          .replace(/Đang chờ chuyển khoản[^\n|]*/gi, '')
          .trim();
        if (cleaned !== o.notes) {
          o.notes = cleaned;
          isDirty = true;
        }
      }

      // Xóa hoàn toàn dripCampaign nếu là đơn 59k / 9 Nguồn
      const is59k = o.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                    (o.product && o.product.includes('9 Nguồn')) || 
                    (o.amount && String(o.amount).includes('59.000'));
      if (is59k && o.dripCampaign) {
        delete o.dripCampaign;
        isDirty = true;
      }
    });

    if (isDirty) {
      saveOrders(orders);
    }

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

      const is9Nguon = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                       (order.product && order.product.includes('9 Nguồn'));
      const readerUrl = is9Nguon 
        ? 'https://daoxuanquang.com.vn/doc-sach/9-nguon-thu-nhap-tu-blog'
        : 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
      const customerName = order.customerName || 'bạn';
      const emailSubject = getOrderEmailSubject(customerName, true, order.product);
      const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

      const emailHtml = renderOrderEmailHtml({
        customerName,
        readerUrl,
        maDon: order.id,
        soTien: order.amount || (is9Nguon ? '59.000đ' : '299.000đ'),
        ngayFormatted: order.date || new Date().toLocaleDateString('vi-VN'),
        productName: is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : undefined
      });

      try {
        await resend.emails.send({
          from: fromSender,
          to: order.email,
          reply_to: 'daoxuanquang26102003@gmail.com',
          subject: emailSubject,
          html: emailHtml
        });
        
        // Tự động cập nhật trạng thái nếu đang chờ
        if (order.status !== 'Đã thanh toán') {
          order.status = 'Đã thanh toán';
        }
        if (order.notes && order.notes.includes('Đang chờ chuyển khoản')) {
          order.notes = order.notes
            .replace(/Đang chờ chuyển khoản[^\n|]*\s*\|\s*/gi, '')
            .replace(/Đang chờ chuyển khoản[^\n|]*/gi, '')
            .trim();
        }

        order.notes = (order.notes ? order.notes + ' | ' : '') + `Đã gửi ebook lúc ${new Date().toLocaleTimeString('vi-VN')}`;
        saveOrders(orders);

        return new Response(JSON.stringify({ success: true, message: `Đã gửi Ebook thành công tới ${order.email}!`, order }), { status: 200 });
      } catch (mailErr: any) {
        return new Response(JSON.stringify({ success: false, error: 'Lỗi gửi mail: ' + mailErr.message }), { status: 500 });
      }
    }

    // 2.1. CONFIRM PAYMENT ACTION (Duyệt thanh toán 1-chạm)
    if (action === 'confirm_payment') {
      const order = orders.find((o: any) => o.id === id);
      if (!order) {
        return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy đơn hàng cần duyệt.' }), { status: 404 });
      }

      order.status = 'Đã thanh toán';
      if (order.notes && order.notes.includes('Đang chờ chuyển khoản')) {
        order.notes = order.notes
          .replace(/Đang chờ chuyển khoản[^\n|]*\s*\|\s*/gi, '')
          .replace(/Đang chờ chuyển khoản[^\n|]*/gi, '')
          .trim();
      }
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
      order.notes = (order.notes ? order.notes + ' | ' : '') + `Admin xác nhận TT lúc ${nowStr}`;

      // Tự động gửi email bàn giao Ebook
      if (order.email) {
        const is9Nguon = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                         (order.product && order.product.includes('9 Nguồn'));
        const readerUrl = is9Nguon 
          ? 'https://daoxuanquang.com.vn/doc-sach/9-nguon-thu-nhap-tu-blog'
          : 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
        const customerName = order.customerName || 'bạn';
        const emailSubject = getOrderEmailSubject(customerName, false, order.product);
        const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

        const emailHtml = renderOrderEmailHtml({
          customerName,
          readerUrl,
          maDon: order.id,
          soTien: order.amount || (is9Nguon ? '59.000đ' : '299.000đ'),
          ngayFormatted: order.date || new Date().toLocaleDateString('vi-VN'),
          productName: is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : undefined
        });

        try {
          await resend.emails.send({
            from: fromSender,
            to: order.email,
            reply_to: 'daoxuanquang26102003@gmail.com',
            subject: emailSubject,
            html: emailHtml
          });
          order.notes += ' (Đã gửi email)';
        } catch (e: any) {
          console.warn('Lỗi gửi email xác nhận:', e);
        }
      }

      saveOrders(orders);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Đã xác nhận thanh toán & gửi Ebook tới ${order.email || order.customerName}!`,
        order 
      }), { status: 200 });
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
        date: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
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

      const newStatus = body.status !== undefined ? body.status.trim() : orders[idx].status;
      let newNotes = body.notes !== undefined ? body.notes.trim() : orders[idx].notes;
      if ((newStatus === 'Đã thanh toán' || newStatus === 'Đã hoàn tất') && newNotes && newNotes.includes('Đang chờ chuyển khoản')) {
        newNotes = newNotes
          .replace(/Đang chờ chuyển khoản[^\n|]*\s*\|\s*/gi, '')
          .replace(/Đang chờ chuyển khoản[^\n|]*/gi, '')
          .trim();
      }

      orders[idx] = {
        ...orders[idx],
        customerName: body.customerName !== undefined ? body.customerName.trim() : orders[idx].customerName,
        email: body.email !== undefined ? body.email.trim() : orders[idx].email,
        phone: body.phone !== undefined ? body.phone.trim() : orders[idx].phone,
        product: body.product !== undefined ? body.product.trim() : orders[idx].product,
        amount: body.amount !== undefined ? body.amount.trim() : orders[idx].amount,
        status: newStatus,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod.trim() : orders[idx].paymentMethod,
        notes: newNotes
      };

      saveOrders(orders);
      return new Response(JSON.stringify({ success: true, message: 'Cập nhật đơn hàng thành công!', order: orders[idx] }), { status: 200 });
    }

    // 5. SEND DRIP EMAIL ACTION (Gửi thử hoặc gửi bù ngày X)
    if (action === 'send_drip_day') {
      const order = orders.find((o: any) => o.id === id);
      if (!order || !order.email) {
        return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy đơn hàng hoặc email khách.' }), { status: 400 });
      }

      const is59k = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                    (order.product && order.product.includes('9 Nguồn')) || 
                    (order.amount && String(order.amount).includes('59.000'));
      if (is59k) {
        return new Response(JSON.stringify({ success: false, error: 'Đơn hàng 59.000đ (9 Nguồn) không áp dụng chuỗi Email 7 ngày.' }), { status: 400 });
      }

      const day = parseInt(body.day, 10);
      if (isNaN(day) || day < 1 || day > 7) {
        return new Response(JSON.stringify({ success: false, error: 'Ngày gửi không hợp lệ (1-7).' }), { status: 400 });
      }

      try {
        const sendRes = await sendDripEmail(day, order.email, order.customerName || 'bạn');
        if (sendRes.error) {
          return new Response(JSON.stringify({ success: false, error: 'Lỗi gửi mail: ' + sendRes.error.message }), { status: 500 });
        }

        if (!order.dripCampaign) {
          order.dripCampaign = { status: 'active', startedAt: order.timestamp || Date.now(), days: [] };
        }
        if (!order.dripCampaign.days) order.dripCampaign.days = [];

        let dayItem = order.dripCampaign.days.find((d: any) => d.day === day);
        if (!dayItem) {
          dayItem = { day, title: DRIP_METADATA[day]?.badge || `Ngày ${day}` };
          order.dripCampaign.days.push(dayItem);
        }
        dayItem.status = 'sent';
        dayItem.sentAt = new Date().toISOString();
        dayItem.resendId = sendRes.data?.id;

        saveOrders(orders);
        return new Response(JSON.stringify({
          success: true,
          message: `Đã gửi thành công Email Ngày ${day} tới ${order.email}!`,
          dayItem
        }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: 'Lỗi gửi mail: ' + err.message }), { status: 500 });
      }
    }

    // 6. SCHEDULE DRIP CAMPAIGN ACTION (Lên lịch lại chuỗi 7 ngày)
    if (action === 'schedule_drip') {
      const order = orders.find((o: any) => o.id === id);
      if (!order || !order.email) {
        return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy đơn hàng hoặc email khách.' }), { status: 400 });
      }

      const is59k = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                    (order.product && order.product.includes('9 Nguồn')) || 
                    (order.amount && String(order.amount).includes('59.000'));
      if (is59k) {
        return new Response(JSON.stringify({ success: false, error: 'Đơn hàng 59.000đ (9 Nguồn) không áp dụng chuỗi Email 7 ngày.' }), { status: 400 });
      }

      try {
        const scheduleRes = await scheduleDripCampaignForOrder(order);
        order.dripCampaign = {
          status: 'active',
          startedAt: order.timestamp || Date.now(),
          days: scheduleRes
        };
        saveOrders(orders);

        return new Response(JSON.stringify({
          success: true,
          message: `Đã lên lịch thành công chuỗi 7 ngày cho ${order.email}!`,
          dripCampaign: order.dripCampaign
        }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: 'Lỗi lên lịch: ' + err.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ success: false, error: 'Hành động không hợp lệ.' }), { status: 400 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
