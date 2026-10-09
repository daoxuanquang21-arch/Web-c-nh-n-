import fs from 'fs';
import path from 'path';

const leadsFilePath = path.resolve('./src/data/leads.json');
const ordersFilePath = path.resolve('./src/data/orders.json');

// Helper kiểm tra xem bản ghi có phải là khảo sát hợp lệ hay không (không phải đơn hàng đặt mua)
function isRealLead(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  // Bỏ qua tất cả đơn hàng mua sản phẩm/ebook (mã EB, có product, hoặc nguồn từ landing page mua hàng)
  if (item.id && String(item.id).startsWith('EB')) return false;
  if (item.product) return false;
  if (item.source && (
    String(item.source).includes('Landing') || 
    String(item.source).includes('landing') || 
    String(item.source).includes('Ebook') || 
    String(item.source).includes('9 Nguồn')
  )) return false;

  // Một bản ghi khảo sát chuyển giao 1-1 hợp lệ phải có bài toán (problem) hoặc vị thế (position) hoặc cam kết (commitment)
  if (!item.problem && !item.position && !item.commitment && !item.solution) {
    return false;
  }
  return true;
}

// Hàm đọc và làm sạch dữ liệu leads, loại bỏ hoàn toàn các đơn hàng bị lưu nhầm vào mục khảo sát
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

  const validLeads = leads.filter(isRealLead);

  // Tự động ghi đè file leads.json sạch sẽ nếu phát hiện đơn hàng bị lẫn
  if (validLeads.length !== leads.length) {
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
