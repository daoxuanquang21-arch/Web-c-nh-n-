import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

const FALLBACK_KEY = Buffer.from('cmVfZk1MeEFyaXJfQUdZdFJqUjFqNm1NR0Vvb2c2UVhZampB', 'base64').toString('utf-8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || FALLBACK_KEY;
const resend = new Resend(RESEND_API_KEY);

export interface DripEmailMeta {
  day: number;
  badge: string;
  title: string;
  subject: string;
  preheader: string;
}

export const DRIP_METADATA: Record<number, DripEmailMeta> = {
  1: {
    day: 1,
    badge: 'Bạn không đi một mình',
    title: 'Thứ quyết định bạn có blog hay không, không nằm trong ebook.',
    subject: '{{TEN_KHACH}}, đây là điều ebook không nói với bạn',
    preheader: 'Không phải kiến thức. Mà là thứ quyết định bạn có đi tới cuối hay không.'
  },
  2: {
    day: 2,
    badge: 'Gỡ kẹt cùng nhau',
    title: 'Cả cuối tuần. Một trang trắng.',
    subject: 'Trang trắng. Cả một cuối tuần.',
    preheader: 'Ngày đó mình kẹt mà không có ai để hỏi. Bạn thì có.'
  },
  3: {
    day: 3,
    badge: 'Chọn ngách ra tiền',
    title: 'Mình viết rất chăm. Và không ra nổi một đồng.',
    subject: 'Mình viết rất chăm. Và không ra nổi một đồng.',
    preheader: 'Không phải do viết dở. Mà do một quyết định sai từ ngày đầu.'
  },
  4: {
    day: 4,
    badge: 'Bài viết đầu tiên',
    title: 'Bài viết “chẳng hay ho gì” vẫn đang mang tiền về cho mình.',
    subject: 'Bài viết “chẳng hay ho gì” vẫn đang mang tiền về cho mình',
    preheader: 'Và vì sao bài đầu tiên của bạn không cần hay.'
  },
  5: {
    day: 5,
    badge: 'Đừng dừng ở giữa',
    title: 'Mình đã bỏ cuộc 5 lần. Đây là điều mình ước có người nói với mình.',
    subject: 'Nếu bạn đang muốn bỏ, đọc email này trước',
    preheader: 'Mình đã ở đúng chỗ bạn đang đứng. 5 lần.'
  },
  6: {
    day: 6,
    badge: 'Cùng nhìn lại',
    title: 'Một tuần trước, tất cả những ô này đều trống.',
    subject: 'Bài kiểm tra 1 phút: bạn đã đi được bao xa?',
    preheader: 'Một tuần trước, tất cả những ô này đều trống.'
  },
  7: {
    day: 7,
    badge: 'Một tuần nhìn lại',
    title: '7 ngày trước, bạn chưa có blog. Hôm nay thì sao?',
    subject: 'Email cuối. Một lời nhờ, và một món quà.',
    preheader: 'Chuỗi email kết thúc. Việc đồng hành thì không.'
  }
};

/**
 * Render nội dung HTML cho một ngày cụ thể trong chuỗi 7 ngày
 */
export function renderDripEmail(day: number, customerName: string): { day: number; subject: string; html: string } | null {
  if (day < 1 || day > 7) return null;

  const templatePath = path.resolve(`./src/data/email-templates/ngay-${day}.html`);
  if (!fs.existsSync(templatePath)) {
    console.error(`Không tìm thấy template HTML cho ngày ${day} tại: ${templatePath}`);
    return null;
  }

  const safeName = customerName?.trim() || 'bạn';
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Thay thế placeholder tên khách
  html = html.replace(/\{\{TEN_KHACH\}\}/g, safeName);

  const meta = DRIP_METADATA[day];
  const subject = (meta?.subject || `Ngày ${day} · Tạo Blog cùng Quảng`).replace(/\{\{TEN_KHACH\}\}/g, safeName);

  return {
    day,
    subject,
    html
  };
}

/**
 * Tính toán thời điểm hẹn giờ gửi email (07:30 sáng giờ Việt Nam = 00:30 UTC)
 * @param dayIndex 1 đến 7 (sau bao nhiêu ngày kể từ ngày mua)
 * @param baseDate Ngày mua (Date object hoặc timestamp)
 */
export function calculateScheduleDate(dayIndex: number, baseDate: Date = new Date()): Date {
  const target = new Date(baseDate.getTime());
  target.setDate(target.getDate() + dayIndex);

  // 07:30:00 sáng giờ VN (GMT+7) tương đương 00:30:00 UTC
  const scheduledUtc = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate(), 0, 30, 0));

  // Nếu thời điểm tính toán nhỏ hơn thời điểm hiện tại + 1 tiếng, chuyển sang sáng hôm sau
  if (scheduledUtc.getTime() - Date.now() < 60 * 60 * 1000) {
    scheduledUtc.setDate(scheduledUtc.getDate() + 1);
  }

  return scheduledUtc;
}

/**
 * Gửi ngay email Ngày X cho một đơn hàng (dùng khi gửi thủ công hoặc cron job đến hạn)
 */
export async function sendDripEmail(day: number, email: string, customerName: string) {
  const emailData = renderDripEmail(day, customerName);
  if (!emailData) {
    throw new Error(`Không tạo được nội dung email Ngày ${day}`);
  }

  const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';

  const result = await resend.emails.send({
    from: fromSender,
    to: email,
    reply_to: 'daoxuanquang26102003@gmail.com',
    subject: emailData.subject,
    html: emailData.html
  });

  return result;
}

/**
 * Lên lịch 7 email trên Resend cho một đơn hàng
 */
export async function scheduleDripCampaignForOrder(order: any): Promise<any[]> {
  if (!order || !order.email) return [];

  const fromSender = process.env.RESEND_FROM || 'Đào Xuân Quảng <ebook@daoxuanquang.com.vn>';
  const customerName = order.customerName || 'bạn';
  const baseDate = order.timestamp ? new Date(order.timestamp) : new Date();

  const results: any[] = [];

  for (let day = 1; day <= 7; day++) {
    const emailData = renderDripEmail(day, customerName);
    if (!emailData) continue;

    const scheduledDate = calculateScheduleDate(day, baseDate);
    const scheduledIso = scheduledDate.toISOString();

    try {
      // Gửi lệnh lên lịch qua Resend với scheduledAt
      const res = await resend.emails.send({
        from: fromSender,
        to: order.email,
        reply_to: 'daoxuanquang26102003@gmail.com',
        subject: emailData.subject,
        html: emailData.html,
        scheduledAt: scheduledIso
      });

      results.push({
        day,
        title: DRIP_METADATA[day]?.badge || `Ngày ${day}`,
        scheduledFor: scheduledIso,
        status: res.error ? 'failed' : 'scheduled',
        resendId: res.data?.id || null,
        error: res.error?.message || null
      });
    } catch (err: any) {
      results.push({
        day,
        title: DRIP_METADATA[day]?.badge || `Ngày ${day}`,
        scheduledFor: scheduledIso,
        status: 'pending',
        error: err.message
      });
    }
  }

  return results;
}
