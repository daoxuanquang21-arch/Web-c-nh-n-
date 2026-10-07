import fs from 'fs';
import path from 'path';

const leadsFilePath = path.resolve('./src/data/leads.json');
const ordersFilePath = path.resolve('./src/data/orders.json');

// Helper kiểm tra xem bản ghi có phải là khảo sát hợp lệ hay không (không phải đơn hàng đặt mua)
function isRealLead(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  // Nếu có trường product và không có bài toán/vị thế khảo sát thì đó là đơn hàng bị lưu nhầm
  if (item.product && !item.position && !item.problem) {
    return false;
  }
  return true;
}

// Hàm đọc và làm sạch dữ liệu leads, di chuyển đơn hàng bị lẫn sang orders.json nếu cần
function getCleanLeads(): any[] {
  let leads: any[] = [];
  if (fs.existsSync(leadsFilePath)) {
    try {
      const data = fs.readFileSync(leadsFilePath, 'utf-8');
      leads = JSON.parse(data || '[]');
    } catch (e) {
      leads = [];
    }
  }

  const validLeads: any[] = [];
  let isDirty = false;

  for (const item of leads) {
    if (isRealLead(item)) {
      validLeads.push(item);
    } else {
      isDirty = true;
      // Nếu là đơn hàng bị ghi nhầm vào leads.json, đảm bảo đã có trong orders.json
      if (item && item.product && fs.existsSync(ordersFilePath)) {
        try {
          const rawOrders = fs.readFileSync(ordersFilePath, 'utf-8');
          const orders = JSON.parse(rawOrders || '[]');
          const exists = orders.some((o: any) => o.id === item.id || (o.email === item.email && o.timestamp === item.timestamp));
          if (!exists) {
            orders.unshift({
              id: item.id || ('EB' + Date.now()),
              customerName: item.name || 'Khách hàng',
              email: item.email,
              phone: item.phone || '',
              product: item.product,
              productId: 'ebook-tao-blog',
              amount: item.amount || '299.000đ',
              status: 'Đã thanh toán',
              paymentMethod: 'Chuyển khoản QR',
              date: item.date || new Date().toLocaleString('vi-VN'),
              timestamp: item.timestamp || Date.now(),
              notes: 'Được tự động chuyển từ mục lưu nhầm'
            });
            fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf-8');
          }
        } catch (_) {}
      }
    }
  }

  // Tự động ghi đè file leads.json sạch nếu phát hiện dữ liệu đơn hàng bị lẫn
  if (isDirty) {
    try {
      fs.writeFileSync(leadsFilePath, JSON.stringify(validLeads, null, 2), 'utf-8');
    } catch (_) {}
  }

  return validLeads;
}

export async function GET() {
  try {
    const leads = getCleanLeads();

    return new Response(JSON.stringify({ success: true, leads }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { name, contact, email, position, commitment, problem, action, date, id } = body;

    let leads = getCleanLeads();

    // Support delete action from admin panel
    if (action === 'delete') {
      if (!email && !id) {
        return new Response(JSON.stringify({ success: false, error: 'Email hoặc ID khảo sát là bắt buộc để xóa.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      leads = leads.filter((lead: any) => {
        if (id && lead.id) return lead.id !== id;
        if (email && date) {
          return !(lead.email === email && lead.date === date);
        }
        if (email) return lead.email !== email;
        return true;
      });

      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
      return new Response(JSON.stringify({ success: true, message: 'Đã xóa bản ghi khảo sát thành công!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!name || (!contact && !body.phone) || !email || !position || !problem) {
      return new Response(JSON.stringify({ success: false, error: 'Vui lòng điền đầy đủ các thông tin khảo sát bắt buộc!' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newLead = {
      id: 'LEAD-' + Date.now(),
      name,
      contact: contact || body.phone,
      email,
      position,
      commitment: commitment || 'Yes',
      problem,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };

    leads.unshift(newLead);
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');

    return new Response(JSON.stringify({ success: true, message: 'Gửi khảo sát thành công!', lead: newLead }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
