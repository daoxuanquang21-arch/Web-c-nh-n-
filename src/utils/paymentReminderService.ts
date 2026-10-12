import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

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
    console.error('[PaymentReminder] Lỗi đọc orders.json:', e);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('[PaymentReminder] Lỗi ghi orders.json:', e);
  }
}

export interface PaymentReminderResult {
  success: boolean;
  orderId: string;
  email: string;
  type: '30m' | '24h' | 'manual';
  message: string;
  error?: string;
}

/**
 * Tạo nội dung HTML Email nhắc thanh toán chuyên nghiệp, kèm mã QR VietQR MBBank
 */
export function renderPaymentReminderEmailHtml(params: {
  customerName: string;
  orderId: string;
  productName: string;
  amountStr: string;
  amountNum: number;
  qrUrl: string;
  reminderType: '30m' | '24h' | 'manual';
}): string {
  const { customerName, orderId, productName, amountStr, amountNum, qrUrl, reminderType } = params;
  const name = customerName || 'bạn';

  const is30m = reminderType === '30m';
  const headerBadge = is30m ? 'NHẮC NHẸ HOÀN TẤT ĐƠN HÀNG' : 'ƯU ĐÃI SẮP HẾT HẠN TRONG NGÀY';
  const headline = is30m 
    ? `${name} ơi, đơn hàng Ebook của bạn đang chờ hoàn tất` 
    : `Nhắc lần cuối: Giữ ưu đãi đặc biệt cho Ebook của bạn`;

  const introText = is30m
    ? `Cảm ơn bạn đã đăng ký mua <strong>${productName}</strong>. Mình thấy đơn hàng của bạn đã được tạo nhưng chưa hoàn tất chuyển khoản (có thể bạn đang bận hoặc gặp lỗi khi mở ứng dụng ngân hàng).<br><br>Hệ thống vẫn đang giữ mức giá ưu đãi <strong>${amountStr}</strong> cho bạn. Bạn chỉ cần quét mã QR bên dưới để nhận ngay ebook trong hộp thư nhé!`
    : `Đã 24 giờ kể từ khi bạn đăng ký nhận <strong>${productName}</strong>. Suất ưu đãi <strong>${amountStr}</strong> của đơn hàng <strong>${orderId}</strong> sẽ sớm được hệ thống giải phóng.<br><br>Nếu bạn vẫn muốn sở hữu Ebook để bắt đầu ngay hôm nay, hãy quét mã QR bên dưới để hoàn tất nhé:`;

  const checkoutUrl = `https://daoxuanquang.com.vn/thanh-toan?id=${encodeURIComponent(orderId)}`;
  const zaloUrl = `https://zalo.me/0702286928`;

  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nhắc thanh toán đơn hàng ${orderId}</title>
<style>
  body,table,td,p,a,b,i,span,div,h1,h2{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif!important}
  body{margin:0;padding:0;background:#F4EFEA;color:#18110D}
  @media (max-width:600px){
    .container{width:100%!important;border-radius:0!important}
    .px{padding-left:18px!important;padding-right:18px!important}
    .qr-img{width:220px!important;height:220px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F4EFEA;color:#18110D;">

<div style="display:none;font-size:1px;color:#F4EFEA;line-height:1px;max-height:0;overflow:hidden;">
  Mã đơn ${orderId} đang chờ bạn hoàn tất. Ebook tự động gửi trong 1 phút sau khi chuyển khoản.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4EFEA;">
<tr><td align="center" style="padding:24px 10px;">

  <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px;max-width:580px;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #EADBCC;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
    
    <!-- HEADER -->
    <tr>
      <td class="px" align="center" style="background:#0F172A;padding:26px 30px;color:#FFFFFF;text-align:center;">
        <div style="display:inline-block;background:#F97316;color:#FFFFFF;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:12px;">
          ${headerBadge}
        </div>
        <h1 style="margin:0;font-size:22px;line-height:1.4;font-weight:800;color:#FFFFFF;">
          ${headline}
        </h1>
      </td>
    </tr>

    <!-- NỘI DUNG CHÍNH -->
    <tr>
      <td class="px" style="padding:28px 32px 20px;background:#FFFFFF;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#332924;">
          Chào <strong>${name}</strong>,
        </p>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4B3E37;">
          ${introText}
        </p>

        <!-- KHUNG MÃ VIETQR -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF9F5;border:2px dashed #F97316;border-radius:14px;margin-bottom:24px;">
          <tr>
            <td align="center" style="padding:24px 18px;">
              
              <div style="font-size:13px;font-weight:700;color:#EA580C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
                Mã VietQR Tự Động MBBank
              </div>

              <!-- ẢNH QR -->
              <div style="background:#FFFFFF;padding:12px;display:inline-block;border-radius:12px;border:1px solid #FED7AA;box-shadow:0 4px 16px rgba(249,115,22,0.12);margin-bottom:14px;">
                <img class="qr-img" src="${qrUrl}" alt="VietQR MBBank ${orderId}" width="230" height="230" style="display:block;border-radius:6px;max-width:100%;">
              </div>

              <div style="font-size:13px;color:#6B5D54;margin-bottom:16px;">
                💡 <em>Mở App ngân hàng bất kỳ (MBBank, Vietcombank, Techcombank...) &rarr; Chọn <strong>Quét mã QR</strong></em>
              </div>

              <!-- BẢNG CHI TIẾT CHUYỂN KHOẢN -->
              <table role="presentation" width="100%" cellpadding="6" cellspacing="0" border="0" style="max-width:440px;background:#FFFFFF;border-radius:10px;border:1px solid #F0DCCE;font-size:14px;color:#2E231D;text-align:left;">
                <tr style="border-bottom:1px solid #F5EAE1;">
                  <td style="color:#78695E;padding:9px 14px;width:38%;">Ngân hàng:</td>
                  <td style="font-weight:700;padding:9px 14px;">MBBank (Quân Đội)</td>
                </tr>
                <tr style="border-bottom:1px solid #F5EAE1;">
                  <td style="color:#78695E;padding:9px 14px;">Số tài khoản:</td>
                  <td style="font-weight:700;padding:9px 14px;color:#0F172A;font-family:monospace;font-size:15px;">0000485725573</td>
                </tr>
                <tr style="border-bottom:1px solid #F5EAE1;">
                  <td style="color:#78695E;padding:9px 14px;">Chủ tài khoản:</td>
                  <td style="font-weight:700;padding:9px 14px;">DAO XUAN QUANG</td>
                </tr>
                <tr style="border-bottom:1px solid #F5EAE1;">
                  <td style="color:#78695E;padding:9px 14px;">Số tiền:</td>
                  <td style="font-weight:800;padding:9px 14px;color:#EA580C;font-size:17px;">${amountStr}</td>
                </tr>
                <tr style="background:#FFF1E8;">
                  <td style="color:#C2410C;font-weight:700;padding:10px 14px;">Nội dung CK:</td>
                  <td style="font-weight:900;padding:10px 14px;color:#C2410C;font-family:monospace;font-size:16px;">${orderId}</td>
                </tr>
              </table>

              <div style="font-size:12px;color:#C2410C;margin-top:10px;font-weight:600;">
                ⚠️ Lưu ý: Giữ nguyên nội dung chuyển khoản <u>${orderId}</u> để hệ thống gửi Ebook tức thì!
              </div>

            </td>
          </tr>
        </table>

        <!-- CAM KẾT 1 PHÚT -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;text-align:center;">
              <span style="font-size:18px;vertical-align:middle;">⚡</span>
              <strong style="color:#065F46;font-size:14px;vertical-align:middle;margin-left:6px;">
                Cam kết: Ebook tự gửi vào email trong 1 phút sau khi chuyển khoản
              </strong>
            </td>
          </tr>
        </table>

        <!-- NÚT BẤM KÊU GỌI HÀNH ĐỘNG -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
          <tr>
            <td align="center">
              <a href="${checkoutUrl}" target="_blank" style="display:inline-block;background:#EA580C;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:15px;padding:14px 34px;border-radius:999px;box-shadow:0 4px 14px rgba(234,88,12,0.35);text-transform:uppercase;letter-spacing:0.3px;">
                👉 Mở Trang Thanh Toán & Tải Mã QR
              </a>
            </td>
          </tr>
        </table>

        <!-- HỖ TRỢ ZALO -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:20px;">
          <tr>
            <td style="padding:12px 16px;text-align:center;font-size:13.5px;color:#475569;">
              💬 Cần hỗ trợ hoặc kiểm tra đơn? Nhắn Zalo mình hỗ trợ ngay: 
              <a href="${zaloUrl}" target="_blank" style="color:#0284C7;font-weight:700;text-decoration:none;margin-left:4px;">
                Zalo 0702 286 928 &rarr;
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td class="px" style="background:#FBF8F5;border-top:1px solid #EADBCC;padding:20px 30px;text-align:center;font-size:12.5px;color:#78695E;">
        <p style="margin:0 0 6px;">© 2026 <strong>Đào Xuân Quảng</strong> · Tác giả Ebook & Chia sẻ kiến thức Blog AI</p>
        <p style="margin:0;">Email: <a href="mailto:daoxuanquang26102003@gmail.com" style="color:#78695E;">daoxuanquang26102003@gmail.com</a> · Hotline: 0702 286 928</p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

/**
 * Quét toàn bộ đơn hàng và gửi email nhắc thanh toán theo quy tắc:
 * - Sau 30 phút (lần 1)
 * - Sau 24 giờ (lần 2)
 * - Mỗi đơn tối đa 2 lần nhắc
 * - Chỉ gửi cho đơn chưa thanh toán
 */
export async function checkAndSendPaymentReminders(): Promise<{
  success: boolean;
  totalChecked: number;
  sentCount: number;
  logs: PaymentReminderResult[];
}> {
  const orders = getOrders();
  const now = Date.now();
  const logs: PaymentReminderResult[] = [];
  let sentCount = 0;
  let isDirty = false;

  for (const order of orders) {
    // 1. Chỉ áp dụng cho đơn chưa thanh toán
    if (order.status === 'Đã thanh toán' || order.status === 'Đã hoàn tất' || order.status === 'Đã hủy') {
      continue;
    }

    if (!order.email || !order.email.includes('@')) {
      continue;
    }

    // 2. Tính thời gian tạo đơn
    const orderTime = order.timestamp || (order.date ? new Date(order.date).getTime() : now);
    const diffMs = now - orderTime;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

    // Khởi tạo đối tượng paymentReminders nếu chưa có
    if (!order.paymentReminders) {
      order.paymentReminders = {
        count: 0,
        reminded30m: false,
        reminded30mAt: null,
        reminded24h: false,
        reminded24hAt: null,
        lastRemindedAt: null
      };
    }

    // Tối đa 2 lần nhắc
    if ((order.paymentReminders.count || 0) >= 2) {
      continue;
    }

    let shouldSendType: '30m' | '24h' | null = null;

    // Kiểm tra mốc 24 giờ trước (nếu đơn đã quá 24h và chưa gửi nhắc 24h)
    if (diffHours >= 24 && !order.paymentReminders.reminded24h) {
      shouldSendType = '24h';
    } 
    // Nếu chưa quá 24h hoặc chưa gửi lần 30m: kiểm tra mốc 30 phút
    else if (diffMinutes >= 30 && !order.paymentReminders.reminded30m) {
      shouldSendType = '30m';
    }

    if (!shouldSendType) {
      continue;
    }

    // Chuẩn bị dữ liệu email
    const is9Nguon = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                     (order.product && order.product.includes('9 Nguồn')) ||
                     (order.amount && String(order.amount).includes('59.000'));
    const amountNum = is9Nguon ? 59000 : 299000;
    const amountStr = order.amount || (is9Nguon ? '59.000đ' : '299.000đ');
    const productName = order.product || (is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI');
    
    // Đường dẫn ảnh QR VietQR SePay
    const qrUrl = `https://qr.sepay.vn/img?acc=0000485725573&bank=MBBank&amount=${amountNum}&des=${encodeURIComponent(order.id)}&template=compact`;

    const emailSubject = shouldSendType === '30m'
      ? `[Nhắc đơn hàng ${order.id}] ${order.customerName || 'Bạn'} ơi, hoàn tất thanh toán để nhận ngay Ebook nhé!`
      : `[Ưu đãi sắp hết hạn - ${order.id}] ${order.customerName || 'Bạn'} ơi, hoàn tất đơn hàng Ebook để giữ suất ưu đãi`;

    const emailHtml = renderPaymentReminderEmailHtml({
      customerName: order.customerName || 'bạn',
      orderId: order.id,
      productName,
      amountStr,
      amountNum,
      qrUrl,
      reminderType: shouldSendType
    });

    const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

    try {
      const sendRes = await resend.emails.send({
        from: fromSender,
        to: order.email,
        reply_to: 'daoxuanquang26102003@gmail.com',
        subject: emailSubject,
        html: emailHtml
      });

      // Cập nhật trạng thái nhắc nhở
      order.paymentReminders.count = (order.paymentReminders.count || 0) + 1;
      order.paymentReminders.lastRemindedAt = new Date().toISOString();

      if (shouldSendType === '30m') {
        order.paymentReminders.reminded30m = true;
        order.paymentReminders.reminded30mAt = new Date().toISOString();
      } else if (shouldSendType === '24h') {
        order.paymentReminders.reminded24h = true;
        order.paymentReminders.reminded24hAt = new Date().toISOString();
      }

      // Ghi chú thêm vào đơn
      const reminderNote = `Đã gửi email nhắc thanh toán (${shouldSendType}) lúc ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}`;
      order.notes = order.notes ? `${order.notes} | ${reminderNote}` : reminderNote;

      isDirty = true;
      sentCount++;

      logs.push({
        success: true,
        orderId: order.id,
        email: order.email,
        type: shouldSendType,
        message: `Đã gửi email nhắc thanh toán (${shouldSendType}) tới ${order.email}`
      });

      console.log(`[PaymentReminder] Đã gửi nhắc ${shouldSendType} cho đơn ${order.id} (${order.email}):`, sendRes);
    } catch (err: any) {
      console.error(`[PaymentReminder] Lỗi gửi nhắc cho đơn ${order.id}:`, err);
      logs.push({
        success: false,
        orderId: order.id,
        email: order.email,
        type: shouldSendType,
        message: `Lỗi gửi email: ${err.message}`,
        error: err.message
      });
    }
  }

  if (isDirty) {
    saveOrders(orders);
  }

  return {
    success: true,
    totalChecked: orders.length,
    sentCount,
    logs
  };
}

/**
 * Gửi email nhắc thanh toán thủ công cho một đơn hàng cụ thể từ Admin
 */
export async function sendManualPaymentReminder(orderId: string): Promise<PaymentReminderResult> {
  const orders = getOrders();
  const order = orders.find((o: any) => o.id === orderId);

  if (!order) {
    return { success: false, orderId, email: '', type: 'manual', message: 'Không tìm thấy đơn hàng' };
  }

  if (order.status === 'Đã thanh toán') {
    return { success: false, orderId, email: order.email, type: 'manual', message: 'Đơn hàng này đã thanh toán rồi' };
  }

  if (!order.email) {
    return { success: false, orderId, email: '', type: 'manual', message: 'Đơn hàng không có email' };
  }

  const is9Nguon = order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' || 
                   (order.product && order.product.includes('9 Nguồn')) ||
                   (order.amount && String(order.amount).includes('59.000'));
  const amountNum = is9Nguon ? 59000 : 299000;
  const amountStr = order.amount || (is9Nguon ? '59.000đ' : '299.000đ');
  const productName = order.product || (is9Nguon ? 'Ebook: 9 Nguồn Thu Nhập Từ Blog' : 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI');
  
  const qrUrl = `https://qr.sepay.vn/img?acc=0000485725573&bank=MBBank&amount=${amountNum}&des=${encodeURIComponent(order.id)}&template=compact`;

  const emailSubject = `[Nhắc đơn hàng ${order.id}] ${order.customerName || 'Bạn'} ơi, hoàn tất thanh toán để nhận ngay Ebook nhé!`;
  const emailHtml = renderPaymentReminderEmailHtml({
    customerName: order.customerName || 'bạn',
    orderId: order.id,
    productName,
    amountStr,
    amountNum,
    qrUrl,
    reminderType: 'manual'
  });

  const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

  try {
    await resend.emails.send({
      from: fromSender,
      to: order.email,
      reply_to: 'daoxuanquang26102003@gmail.com',
      subject: emailSubject,
      html: emailHtml
    });

    if (!order.paymentReminders) {
      order.paymentReminders = { count: 0, reminded30m: false, reminded30mAt: null, reminded24h: false, reminded24hAt: null, lastRemindedAt: null };
    }
    order.paymentReminders.count = (order.paymentReminders.count || 0) + 1;
    order.paymentReminders.lastRemindedAt = new Date().toISOString();
    order.notes = (order.notes ? order.notes + ' | ' : '') + `Gửi nhắc thủ công lúc ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}`;

    saveOrders(orders);

    return {
      success: true,
      orderId,
      email: order.email,
      type: 'manual',
      message: `Đã gửi email nhắc thanh toán thành công tới ${order.email}`
    };
  } catch (err: any) {
    return {
      success: false,
      orderId,
      email: order.email,
      type: 'manual',
      message: `Lỗi gửi email: ${err.message}`,
      error: err.message
    };
  }
}

// Khởi tạo interval tự động chạy ngầm trong Node server (mỗi 5 phút kiểm tra 1 lần)
let reminderIntervalStarted = false;
if (typeof process !== 'undefined' && !reminderIntervalStarted) {
  reminderIntervalStarted = true;
  // Delay 30 giây sau khi server khởi động rồi chạy định kỳ mỗi 5 phút
  setTimeout(() => {
    checkAndSendPaymentReminders().catch(() => {});
    setInterval(() => {
      checkAndSendPaymentReminders().catch(() => {});
    }, 5 * 60 * 1000);
  }, 30 * 1000);
}
