import fs from 'fs';
import path from 'path';

export const prerender = false;

const productsFilePath = path.resolve('./src/data/products.json');

export async function GET() {
  try {
    let products = [];
    if (fs.existsSync(productsFilePath)) {
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      products = JSON.parse(data || '[]');
    }

    return new Response(JSON.stringify({ success: true, products }), {
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
    const { 
      id, 
      title, 
      description, 
      type = 'Ebook', 
      status = '', 
      icon = '📦', 
      price = 'Liên hệ', 
      action, 
      image = '', 
      link = '',
      featured = false 
    } = body;

    let products = [];
    if (fs.existsSync(productsFilePath)) {
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      products = JSON.parse(data || '[]');
    }

    // Support delete action from admin panel
    if (action === 'delete') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Cần mã định danh (ID) để xóa sản phẩm.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      products = products.filter((p: any) => p.id !== id);
      fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf-8');
      return new Response(JSON.stringify({ success: true, message: 'Xóa sản phẩm thành công!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validation for create/update
    const cleanId = (id || '').trim();
    const cleanTitle = (title || '').trim();
    const cleanDesc = (description || '').trim();

    if (!cleanId || !cleanTitle) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Vui lòng nhập Tên sản phẩm và Mã định danh (ID/Slug)!' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newProduct: any = { 
      id: cleanId, 
      title: cleanTitle, 
      description: cleanDesc, 
      type: (type || 'Ebook').trim(), 
      icon: (icon || '📦').trim()
    };

    if (status && status.trim()) {
      newProduct.status = status.trim();
    }
    if (price && price.trim()) {
      newProduct.price = price.trim();
    }
    if (image && image.trim()) {
      newProduct.image = image.trim();
    }
    if (link && link.trim()) {
      newProduct.link = link.trim();
    }
    if (typeof featured === 'boolean') {
      newProduct.featured = featured;
    }

    // Check if product ID already exists to decide between update and create
    const existingIndex = products.findIndex((p: any) => p.id === cleanId);
    if (existingIndex !== -1) {
      // Update existing
      products[existingIndex] = { ...products[existingIndex], ...newProduct };
    } else {
      // Create new
      products.push(newProduct);
    }

    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf-8');

    return new Response(JSON.stringify({ 
      success: true, 
      message: existingIndex !== -1 ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm mới thành công!',
      product: newProduct 
    }), {
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
