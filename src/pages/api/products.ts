import fs from 'node:fs';
import path from 'node:path';



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
      headers: { 'Content-Type': 'application/json' }
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
    const { id, title, description, type, status, icon, price, action } = body;

    let products = [];
    if (fs.existsSync(productsFilePath)) {
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      products = JSON.parse(data || '[]');
    }

    // Support delete action from admin panel
    if (action === 'delete') {
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Product ID required for deletion' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      products = products.filter((p: any) => p.id !== id);
      fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf-8');
      return new Response(JSON.stringify({ success: true, message: 'Product deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title || !description || !type || !status || !icon || !id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newProduct = { id, title, description, type, status, icon, price: price || 'Liên hệ' };

    // Check if product ID already exists to decide between update and create
    const existingIndex = products.findIndex((p: any) => p.id === id);
    if (existingIndex !== -1) {
      // Update existing
      products[existingIndex] = newProduct;
    } else {
      // Create new
      products.push(newProduct);
    }

    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf-8');

    return new Response(JSON.stringify({ success: true, message: 'Product saved successfully' }), {
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
