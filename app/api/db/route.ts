import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { NextRequest, NextResponse } from 'next/server';

const DB_PATH = resolve(process.cwd(), 'data', 'positions.db');

// GET — export database
export async function GET() {
  try {
    if (!existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'No database found' }, { status: 404 });
    }
    const data = readFileSync(DB_PATH);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="bitcoio-positions.db"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — import database
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('db') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate it's a SQLite file (starts with "SQLite format 3")
    const buffer = Buffer.from(await file.arrayBuffer());
    const header = buffer.slice(0, 16).toString();
    if (!header.startsWith('SQLite format 3')) {
      return NextResponse.json({ error: 'Invalid SQLite database file' }, { status: 400 });
    }

    // Backup existing database if present
    if (existsSync(DB_PATH)) {
      const backupPath = DB_PATH + '.backup.' + Date.now();
      writeFileSync(backupPath, readFileSync(DB_PATH));
    }

    writeFileSync(DB_PATH, buffer);
    return NextResponse.json({
      success: true,
      size: buffer.length,
      message: `Database imported (${(buffer.length / 1024).toFixed(1)} KB)${existsSync(DB_PATH + '.backup.' + Date.now()) ? ' — backup saved' : ''}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
