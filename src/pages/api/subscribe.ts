import fs from 'fs';
import path from 'path';



const subscribersFilePath = path.resolve('./src/data/subscribers.json');

export async function GET() {
  try {
    let subscribers = [];
    if (fs.existsSync(subscribersFilePath)) {
      const data = fs.readFileSync(subscribersFilePath, 'utf-8');
      subscribers = JSON.parse(data || '[]');
    }

    return new Response(JSON.stringify({ success: true, subscribers }), {
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
    const { name, email, action } = body;

    let subscribers = [];
    if (fs.existsSync(subscribersFilePath)) {
      const data = fs.readFileSync(subscribersFilePath, 'utf-8');
      subscribers = JSON.parse(data || '[]');
    }

    // Support delete action from admin panel
    if (action === 'delete') {
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: 'Email required for deletion' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      subscribers = subscribers.filter((sub: any) => sub.email !== email);
      fs.writeFileSync(subscribersFilePath, JSON.stringify(subscribers, null, 2), 'utf-8');
      return new Response(JSON.stringify({ success: true, message: 'Subscriber deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!name || !email) {
      return new Response(JSON.stringify({ success: false, error: 'Missing name or email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email already exists
    const exists = subscribers.some((sub: any) => sub.email === email);
    if (!exists) {
      subscribers.push({
        name,
        email,
        date: new Date().toISOString()
      });
      fs.writeFileSync(subscribersFilePath, JSON.stringify(subscribers, null, 2), 'utf-8');
    }

    return new Response(JSON.stringify({ success: true, message: 'Subscribed successfully' }), {
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
