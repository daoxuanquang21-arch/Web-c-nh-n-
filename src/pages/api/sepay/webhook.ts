import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { renderOrderEmailHtml, getOrderEmailSubject } from '../../../utils/orderEmailTemplate';
import { scheduleDripCampaignForOrder } from '../../../utils/dripEmails';
import { sendMetaCapiPurchase } from '../../../utils/metaCapi';

export const prerender = false;

const EXPECTED_API_KEY = 'daoxuanquangvip.com.vn';
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
    console.error('[SePay Webhook] Lỗi đọc orders.json:', e);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SePay Webhook] Lỗi ghi orders.json:', e);
  }
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    service: 'SePay Webhook Listener',
    domain: 'daoxuanquang.com.vn',
    status: 'active',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Xác thực API Key từ SePay Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const isValidAuth = 
      authHeader.includes(EXPECTED_API_KEY) || 
      authHeader.toLowerCase().includes(`apikey ${EXPECTED_API_KEY.toLowerCase()}`) ||
      authHeader.trim() === EXPECTED_API_KEY;

    if (!isValidAuth) {
      console.warn('[SePay Webhook] Lỗi xác thực: Authorization header không hợp lệ:', authHeader);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized: Sai API Key' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Phân tích dữ liệu JSON webhook từ SePay
    const payload = await request.json();
    console.log('[SePay Webhook] Nhận dữ liệu webhook:', JSON.stringify(payload));

    const {
      id: transactionId,
      gateway,
      accountNumber,
      subAccount,
      code,
      content,
      transferType,
      transferAmount,
      referenceCode
    } = payload;

    // Bỏ qua nếu là giao dịch tiền ra (out)
    if (transferType && transferType.toLowerCase() === 'out') {
      return new Response(JSON.stringify({ success: true, message: 'Bỏ qua giao dịch tiền ra' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Trích xuất mã đơn hàng từ `code` hoặc `content`
    let orderCode: string | null = (code && typeof code === 'string' && code.trim()) ? code.trim() : null;

    if (!orderCode && content && typeof content === 'string') {
      const match = content.match(/\b(EB\d{4,12})\b/i) || content.match(/(EB\d+)/i);
      if (match) {
        orderCode = match[1].toUpperCase();
      }
    }

    let orders = getOrders();
    let targetOrder: any = null;

    // 3.1. Tìm theo orderCode (EB...)
    if (orderCode) {
      targetOrder = orders.find((o: any) => o.id && o.id.toUpperCase() === orderCode?.toUpperCase());
    }

    // 3.2. Quét xem content có chứa mã đơn EB nào không
    if (!targetOrder && content) {
      const normalizedContent = content.toUpperCase();
      targetOrder = orders.find((o: any) => o.id && normalizedContent.includes(o.id.toUpperCase()));
    }

    // 3.3. Quét xem content có chứa số điện thoại khách hàng không (hỗ trợ cả 0702286928 và 702286928)
    if (!targetOrder && content) {
      const rawDigits = content.replace(/[^0-9]/g, '');
      targetOrder = orders.find((o: any) => {
        if (!o.phone) return false;
        const cleanPhone = o.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 9) {
          const noZeroPhone = cleanPhone.replace(/^0/, '');
          return rawDigits.includes(cleanPhone) || rawDigits.includes(noZeroPhone);
        }
        return false;
      });
    }

    // 3.4. Quét theo cú pháp chuyển khoản đã lưu trong notes (ví dụ: "Đang chờ chuyển khoản: 9NGUON ...")
    if (!targetOrder && content) {
      const compactContent = content.toUpperCase().replace(/\s+/g, '');
      targetOrder = orders.find((o: any) => {
        if (!o.notes) return false;
        const noteMatch = o.notes.match(/Đang chờ chuyển khoản:\s*([^\n|]+)/i);
        if (noteMatch) {
          const expected = noteMatch[1].toUpperCase().replace(/\s+/g, '');
          return compactContent.includes(expected) || (expected.length >= 6 && compactContent.includes(expected.slice(-6)));
        }
        return false;
      });
    }

    // 4. Xử lý khi tìm thấy đơn hàng
    if (targetOrder) {
      console.log(`[SePay Webhook] Khớp đơn hàng: ${targetOrder.id} - Khách: ${targetOrder.customerName} (${targetOrder.email})`);

      // Nếu đơn hàng đã thanh toán trước đó
      if (targetOrder.status === 'Đã thanh toán') {
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Đơn hàng ${targetOrder.id} đã được kích hoạt thanh toán trước đó.` 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Cập nhật trạng thái đơn hàng thành "Đã thanh toán"
      const now = new Date();
      targetOrder.status = 'Đã thanh toán';
      targetOrder.paymentMethod = `Chuyển khoản SePay (${gateway || 'MBBank'})`;
      targetOrder.transactionId = referenceCode || String(transactionId || '');
      targetOrder.paidAt = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
      
      const sepayNote = `SePay tự động kích hoạt GD #${transactionId || ''} (${Number(transferAmount || 0).toLocaleString('vi-VN')}đ) lúc ${now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}`;
      const cleanExistingNotes = (targetOrder.notes || '')
        .replace(/Đang chờ chuyển khoản[^\n|]*/gi, '')
        .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
        .trim();
      targetOrder.notes = cleanExistingNotes ? `${cleanExistingNotes} | ${sepayNote}` : sepayNote;

      saveOrders(orders);

      const is9Nguon = targetOrder.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                       (targetOrder.product && targetOrder.product.includes('9 Nguồn'));
      const defaultAmount = is9Nguon ? 59000 : 299000;

      // 5. Gửi sự kiện Purchase từ máy chủ qua Meta Conversions API (CAPI)
      try {
        const numericAmount = Number(
          String(targetOrder.amount || transferAmount || defaultAmount).replace(/[^\d]/g, '')
        ) || defaultAmount;

        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        await sendMetaCapiPurchase({
          orderId: targetOrder.id,
          amount: numericAmount,
          currency: 'VND',
          email: targetOrder.email,
          phone: targetOrder.phone,
          clientIp,
          clientUserAgent: userAgent,
          sourceUrl: is9Nguon ? 'https://daoxuanquang.com.vn/9-nguon-thu-nhap-tu-blog' : 'https://daoxuanquang.com.vn/ebook-tao-blog'
        });
      } catch (capiErr) {
        console.warn('[SePay Webhook] Cảnh báo gửi Meta CAPI Purchase:', capiErr);
      }

      // 6. Tự động gửi Email giao Ebook cho khách hàng
      const customerName = targetOrder.customerName || 'bạn';
      const email = targetOrder.email;
      const readerUrl = is9Nguon 
        ? 'https://daoxuanquang.com.vn/doc-sach/9-nguon-thu-nhap-tu-blog' 
        : 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
      const emailSubject = getOrderEmailSubject(customerName, false, targetOrder.product);
      const emailHtml = renderOrderEmailHtml({
        customerName,
        readerUrl,
        maDon: targetOrder.id,
        soTien: targetOrder.amount || `${Number(transferAmount || defaultAmount).toLocaleString('vi-VN')}đ`,
        ngayFormatted: now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        productName: is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : undefined
      });

      const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

      try {
        const sendResult = await resend.emails.send({
          from: fromSender,
          to: email,
          reply_to: 'daoxuanquang26102003@gmail.com',
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`[SePay Webhook] Đã gửi email giao Ebook tới ${email}:`, sendResult);
      } catch (mailErr: any) {
        console.error('[SePay Webhook] Lỗi gửi email giao Ebook:', mailErr);
      }

      // 7. Kích hoạt chuỗi email chăm sóc 7 ngày liên tục (cho Tạo Blog)
      if (!is9Nguon) {
        try {
          const dripResults = await scheduleDripCampaignForOrder({
            customerName,
            email,
            timestamp: Date.now()
          });

          orders = getOrders();
          const curIdx = orders.findIndex((o: any) => o.id === targetOrder.id);
          if (curIdx !== -1) {
            orders[curIdx].dripCampaign = {
              status: 'active',
              startedAt: Date.now(),
              days: dripResults
            };
            saveOrders(orders);
          }
          console.log(`[SePay Webhook] Đã kích hoạt chuỗi 7 ngày cho đơn ${targetOrder.id}`);
        } catch (dripErr) {
          console.warn('[SePay Webhook] Cảnh báo kích hoạt chuỗi 7 ngày:', dripErr);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Xác thực và kích hoạt đơn hàng ${targetOrder.id} thành công!`,
        orderId: targetOrder.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 8. Nếu không khớp đơn nào (ví dụ SePay bấm "Gửi thử Webhook" hoặc chuyển khoản không có mã đơn)
    console.log('[SePay Webhook] Giao dịch không khớp mã đơn sẵn có hoặc là Webhook test:', { orderCode, content, transferAmount });
    
    // Nếu có tiền thật chuyển vào tài khoản VA mà không có mã đơn trước đó, tự tạo đơn mới để lưu vào CRM
    if (transferAmount && Number(transferAmount) >= 50000) {
      const now = new Date();
      const is9Nguon = Number(transferAmount) < 200000;
      const newOrderId = orderCode || ('EB' + now.getFullYear().toString().slice(-2) + (now.getMonth() + 1).toString().padStart(2, '0') + Math.floor(1000 + Math.random() * 9000));
      const autoOrder = {
        id: newOrderId,
        customerName: 'Khách chuyển khoản SePay',
        email: 'chua-co-email@daoxuanquang.com.vn',
        phone: '',
        product: is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
        productId: is9Nguon ? 'ebook-9-cach-tao-thu-nhap-tu-blog' : 'ebook-tao-blog',
        amount: `${Number(transferAmount).toLocaleString('vi-VN')}đ`,
        status: 'Đã thanh toán',
        paymentMethod: `SePay (${gateway || 'MBBank'}) - TK: ${accountNumber || subAccount || '0000485725573'}`,
        date: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
        timestamp: Date.now(),
        notes: `Tự động tạo từ SePay GD #${transactionId}: ${content || ''}`
      };
      orders.unshift(autoOrder);
      saveOrders(orders);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook processed successfully (test or unmatched code).' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[SePay Webhook] Lỗi hệ thống:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
