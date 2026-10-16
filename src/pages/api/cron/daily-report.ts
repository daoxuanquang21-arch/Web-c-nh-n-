import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { sendTelegramMessage } from '../../../utils/telegram';

export const prerender = false;

const ordersFilePath = path.resolve('./src/data/orders.json');

function getOrders(): any[] {
  try {
    if (fs.existsSync(ordersFilePath)) {
      const raw = fs.readFileSync(ordersFilePath, 'utf-8');
      return JSON.parse(raw || '[]');
    }
  } catch (e) {
    console.error('Error reading orders.json in daily-report:', e);
  }
  return [];
}

function parseAmount(amount: any): number {
  if (typeof amount === 'number') return amount;
  if (!amount) return 0;
  const cleaned = String(amount).replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function getDateStringVn(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }); // ví dụ "15/10/2026"
}

function getMonthStringVn(timestamp: number): string {
  const d = new Date(timestamp);
  const m = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' });
  const y = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' });
  return `${m}/${y}`;
}

export async function generateAndSendDailyReport(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const orders = getOrders();
    const now = Date.now();

    // Xác định ngày hôm qua theo giờ Việt Nam (GMT+7)
    // 24 tiếng trước tính từ hiện tại
    const yesterdayTimestamp = now - 24 * 60 * 60 * 1000;
    const yesterdayDateStr = getDateStringVn(yesterdayTimestamp);
    const currentMonthStr = getMonthStringVn(now);

    let yesterdayTotalRevenue = 0;
    let yesterdayPaidCount = 0;
    let yesterdayPendingCount = 0;

    let ebookTaoBlogCount = 0;
    let ebookTaoBlogRevenue = 0;

    let ebook9NguonCount = 0;
    let ebook9NguonRevenue = 0;

    let otherCount = 0;
    let otherRevenue = 0;

    // Số liệu lũy kế tháng này
    let monthTotalRevenue = 0;
    let monthPaidCount = 0;

    for (const order of orders) {
      const orderTs = order.timestamp || (order.date ? new Date(order.date).getTime() : 0);
      if (!orderTs) continue;

      const orderDateStr = getDateStringVn(orderTs);
      const orderMonthStr = getMonthStringVn(orderTs);
      const amountNum = parseAmount(order.amount);
      const isPaid = order.status === 'Đã thanh toán';

      // 1. Thống kê lũy kế tháng hiện tại
      if (orderMonthStr === currentMonthStr && isPaid) {
        monthTotalRevenue += amountNum;
        monthPaidCount += 1;
      }

      // 2. Thống kê riêng cho ngày hôm qua
      if (orderDateStr === yesterdayDateStr) {
        if (isPaid) {
          yesterdayPaidCount += 1;
          yesterdayTotalRevenue += amountNum;

          const is9Nguon = 
            order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' ||
            (order.product && String(order.product).includes('9 Nguồn')) ||
            amountNum <= 99000;

          const isTaoBlog = 
            order.productId === 'ebook-tao-blog' ||
            (order.product && String(order.product).includes('Tạo Blog')) ||
            amountNum >= 200000;

          if (is9Nguon) {
            ebook9NguonCount += 1;
            ebook9NguonRevenue += amountNum;
          } else if (isTaoBlog) {
            ebookTaoBlogCount += 1;
            ebookTaoBlogRevenue += amountNum;
          } else {
            otherCount += 1;
            otherRevenue += amountNum;
          }
        } else {
          // Đơn chưa thanh toán
          yesterdayPendingCount += 1;
        }
      }
    }

    const reportMessage = `
📊 <b>BÁO CÁO DOANH THU HÀNG NGÀY (7:00 AM)</b>
━━━━━━━━━━━━━━━━━━
📅 <b>Hôm qua (${yesterdayDateStr}):</b>
💵 <b>Doanh thu:</b> <b>${yesterdayTotalRevenue.toLocaleString('vi-VN')}đ</b>
✅ <b>Đơn thành công:</b> <b>${yesterdayPaidCount} đơn</b>
⏳ <b>Đơn chưa thanh toán:</b> <b>${yesterdayPendingCount} đơn</b>

📦 <b>Chi tiết sản phẩm hôm qua:</b>
• <b>Ebook Tạo Blog (299k):</b> ${ebookTaoBlogCount} đơn (${ebookTaoBlogRevenue.toLocaleString('vi-VN')}đ)
• <b>Ebook 9 Nguồn (59k):</b> ${ebook9NguonCount} đơn (${ebook9NguonRevenue.toLocaleString('vi-VN')}đ)${otherCount > 0 ? `\n• <b>Khác:</b> ${otherCount} đơn (${otherRevenue.toLocaleString('vi-VN')}đ)` : ''}
━━━━━━━━━━━━━━━━━━
📈 <b>Lũy kế Tháng ${currentMonthStr}:</b>
💰 <b>Tổng doanh thu:</b> <b>${monthTotalRevenue.toLocaleString('vi-VN')}đ</b>
🎯 <b>Tổng đơn hoàn tất:</b> <b>${monthPaidCount} đơn</b>
━━━━━━━━━━━━━━━━━━
<i>Chúc anh một ngày mới làm việc tràn đầy năng lượng và bùng nổ doanh số! 🚀</i>
`.trim();

    const isSent = await sendTelegramMessage(reportMessage);

    return {
      success: isSent,
      data: {
        yesterdayDate: yesterdayDateStr,
        yesterdayRevenue: yesterdayTotalRevenue,
        yesterdayPaidCount,
        yesterdayPendingCount,
        monthTotalRevenue,
        monthPaidCount
      }
    };
  } catch (err: any) {
    console.error('[Daily Report Error]:', err);
    return { success: false, error: err.message };
  }
}

export const ALL: APIRoute = async () => {
  const result = await generateAndSendDailyReport();
  return new Response(JSON.stringify(result, null, 2), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
