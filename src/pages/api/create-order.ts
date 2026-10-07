import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const ordersFilePath = path.resolve('./src/data/orders.json');
const leadsFilePath = path.resolve('./src/data/leads.json');

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
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving orders.json:', e);
  }
}

function saveLead(lead: any): void {
  try {
    let leads: any[] = [];
    if (fs.existsSync(leadsFilePath)) {
      leads = JSON.parse(fs.readFileSync(leadsFilePath, 'utf-8') || '[]');
    }
    leads.unshift(lead);
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Lỗi lưu leads.json:', e);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let name = '';
    let email = '';
    let phone = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json();
        name = body.name || '';
        email = body.email || '';
        phone = body.phone || '';
      } catch (_) {}
    } else {
      try {
        const formData = await request.formData();
        name = formData.get('name')?.toString() || '';
        email = formData.get('email')?.toString() || '';
        phone = formData.get('phone')?.toString() || '';
      } catch (_) {}
    }

    name = name.trim();
    email = email.trim();
    phone = phone.trim();

    if (!name || !email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Vui lòng nhập đầy đủ Họ tên và Email!' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const orderId = 'EB' + now.getFullYear().toString().slice(-2) + (now.getMonth() + 1).toString().padStart(2, '0') + Math.floor(1000 + Math.random() * 9000);
    const amountNum = 299000;
    const amountStr = '299.000đ';

    const newOrder = {
      id: orderId,
      customerName: name,
      email: email,
      phone: phone,
      product: 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
      productId: 'ebook-tao-blog',
      amount: amountStr,
      status: 'Chờ thanh toán',
      paymentMethod: 'Chuyển khoản SePay (MBBank)',
      date: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
      timestamp: Date.now(),
      notes: 'Đang chờ chuyển khoản qua mã QR SePay VA 96247QUANG'
    };

    const orders = getOrders();
    orders.unshift(newOrder);
    saveOrders(orders);

    // Lưu lead vào danh sách khảo sát/tiềm năng
    saveLead({
      id: orderId,
      name,
      email,
      phone,
      source: 'Landing Page Ebook',
      createdAt: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
    });

    const qrUrl = `https://qr.sepay.vn/img?acc=96247QUANG&bank=MBBank&amount=${amountNum}&des=${orderId}&template=compact`;

    return new Response(JSON.stringify({
      success: true,
      orderId,
      amount: amountNum,
      formattedAmount: amountStr,
      bank: 'MBBank',
      accountNumber: '96247QUANG',
      accountName: 'DAO XUAN QUANG',
      qrUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Lỗi API create-order:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
