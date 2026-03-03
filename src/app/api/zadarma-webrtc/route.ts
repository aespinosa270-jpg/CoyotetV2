import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  // Jalamos las variables de tu .env de forma dinámica y segura
  const KEY = process.env.ZADARMA_KEY || "";
  const SECRET = process.env.ZADARMA_SECRET || "";
  const sip = process.env.SIP || "";

  if (!KEY || !SECRET || !sip) {
    return NextResponse.json({ error: "Faltan variables de entorno en Vercel" }, { status: 500 });
  }

  const method = "/v1/webrtc/get_key/";
  const params = `sip=${sip}`;

  const md5 = crypto.createHash('md5').update(params).digest('hex');
  const dataToSign = method + params + md5;
  const hmac = crypto.createHmac('sha1', SECRET).update(dataToSign).digest('hex');
  const signature = Buffer.from(hmac).toString('base64');

  try {
    const response = await fetch(`https://api.zadarma.com${method}?${params}`, {
      headers: {
        'Authorization': `${KEY}:${signature}`
      },
      cache: 'no-store' 
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error contactando a Zadarma:", error);
    return NextResponse.json({ error: "Falla de red" }, { status: 500 });
  }
}