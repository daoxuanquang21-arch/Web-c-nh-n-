import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const contentDir = path.resolve('./src/content/cuoc-song');
    let files: string[] = [];
    if (fs.existsSync(contentDir)) {
      files = fs.readdirSync(contentDir);
    }
    
    return new Response(JSON.stringify({ success: true, files }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
