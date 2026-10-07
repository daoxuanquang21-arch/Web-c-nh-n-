import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const ordersFilePath = path.resolve('./src/data/orders.json');

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

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.trim();

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Thiếu mã đơn hàng id.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    const orders = getOrders();
    const order = orders.find((o: any) => o.id && o.id.toUpperCase() === id.toUpperCase());

    if (!order) {
      return new Response(JSON.stringify({ 
        success: false, 
        paid: false, 
        error: 'Không tìm thấy đơn hàng.' 
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    const isPaid = order.status === 'Đã thanh toán';

    return new Response(JSON.stringify({
      success: true,
      paid: isPaid,
      status: order.status,
      orderId: order.id,
      customerName: order.customerName,
      email: order.email,
      amount: order.amount
    }), {
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
