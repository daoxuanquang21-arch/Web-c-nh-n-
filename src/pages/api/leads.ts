import fs from 'node:fs';
import path from 'node:path';



const leadsFilePath = path.resolve('./src/data/leads.json');

export async function GET() {
  try {
    let leads = [];
    if (fs.existsSync(leadsFilePath)) {
      const data = fs.readFileSync(leadsFilePath, 'utf-8');
      leads = JSON.parse(data || '[]');
    }

    return new Response(JSON.stringify({ success: true, leads }), {
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
    const { name, contact, email, position, commitment, problem, action, date } = body;

    let leads = [];
    if (fs.existsSync(leadsFilePath)) {
      const data = fs.readFileSync(leadsFilePath, 'utf-8');
      leads = JSON.parse(data || '[]');
    }

    // Support delete action from admin panel
    if (action === 'delete') {
      if (!email || !date) {
        return new Response(JSON.stringify({ success: false, error: 'Email and date required for deletion' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      leads = leads.filter((lead: any) => !(lead.email === email && lead.date === date));
      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
      return new Response(JSON.stringify({ success: true, message: 'Lead deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!name || !contact || !email || !position || !commitment || !problem) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    leads.push({
      name,
      contact,
      email,
      position,
      commitment,
      problem,
      date: new Date().toISOString()
    });
    
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');

    return new Response(JSON.stringify({ success: true, message: 'Lead submitted successfully' }), {
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
