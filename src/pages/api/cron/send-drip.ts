import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { sendDripEmail, DRIP_METADATA } from '../../../utils/dripEmails';

export const prerender = false;

const ordersFilePath = path.resolve('./src/data/orders.json');

function getOrders(): any[] {
  try {
    if (fs.existsSync(ordersFilePath)) {
      const raw = fs.readFileSync(ordersFilePath, 'utf-8');
      return JSON.parse(raw || '[]');
    }
  } catch (e) {
    console.error('Error reading orders.json in cron:', e);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
}

/**
 * Endpoint chạy tự động (hoặc kích hoạt từ Admin) để kiểm tra và gửi email đến hạn
 * GET hoặc POST /api/cron/send-drip
 */
export const ALL: APIRoute = async ({ request }) => {
  try {
    const orders = getOrders();
    const now = Date.now();
    const sentLogs: any[] = [];
    let updatedCount = 0;

    for (const order of orders) {
      // Chỉ gửi cho đơn đã thanh toán và có email
      if (order.status !== 'Đã thanh toán' || !order.email) continue;

      // KHÔNG gửi chuỗi 7 ngày cho khách mua đơn 59k / 9 Nguồn Thu Nhập
      const is59kOr9Nguon = 
        order.productId === 'ebook-9-cach-tao-thu-nhap-tu-blog' ||
        (order.product && order.product.includes('9 Nguồn')) ||
        (order.amount && String(order.amount).includes('59.000'));
      if (is59kOr9Nguon) continue;

      const orderTime = order.timestamp || (order.date ? new Date(order.date).getTime() : now);
      // Tính số ngày trôi qua kể từ khi mua
      const diffTime = now - orderTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (!order.dripCampaign) {
        order.dripCampaign = {
          status: 'active',
          startedAt: orderTime,
          days: []
        };
      }

      // Kiểm tra từng ngày từ 1 đến 7
      for (let day = 1; day <= 7; day++) {
        // Chỉ gửi nếu đã trôi qua ít nhất `day` ngày
        if (diffDays >= day) {
          let dayRecord = order.dripCampaign.days?.find((d: any) => d.day === day);

          if (!dayRecord) {
            dayRecord = {
              day,
              title: DRIP_METADATA[day]?.badge || `Ngày ${day}`,
              status: 'pending'
            };
            if (!order.dripCampaign.days) order.dripCampaign.days = [];
            order.dripCampaign.days.push(dayRecord);
          }

          // Nếu chưa gửi thành công, tiến hành gửi
          if (dayRecord.status !== 'sent') {
            try {
              const sendRes = await sendDripEmail(day, order.email, order.customerName || 'bạn');
              if (sendRes.error) {
                dayRecord.status = 'failed';
                dayRecord.error = sendRes.error.message;
                sentLogs.push({
                  orderId: order.id,
                  email: order.email,
                  day,
                  status: 'failed',
                  error: sendRes.error.message
                });
              } else {
                dayRecord.status = 'sent';
                dayRecord.sentAt = new Date().toISOString();
                dayRecord.resendId = sendRes.data?.id;
                sentLogs.push({
                  orderId: order.id,
                  email: order.email,
                  day,
                  status: 'sent',
                  resendId: sendRes.data?.id
                });
                updatedCount++;
              }
            } catch (sendErr: any) {
              dayRecord.status = 'failed';
              dayRecord.error = sendErr.message;
              sentLogs.push({
                orderId: order.id,
                email: order.email,
                day,
                status: 'failed',
                error: sendErr.message
              });
            }
          }
        }
      }
    }

    if (updatedCount > 0 || sentLogs.length > 0) {
      saveOrders(orders);
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      sentCount: updatedCount,
      logs: sentLogs,
      message: `Đã xử lý xong. Đã gửi ${updatedCount} email chăm sóc.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Lỗi cron send-drip:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
