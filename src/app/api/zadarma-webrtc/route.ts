import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  // Tus credenciales maestras seguras
  const KEY = "f388006ebe099c2ba400";
  const SECRET = "d4a098d54bdd10cf1042";
  const sip = "267018-100"; // Tu base + tu extensión

  const method = "/v1/webrtc/get_key/";
  const params = `sip=${sip}`;

  // Algoritmo de seguridad estricto que pide Zadarma
  const md5 = crypto.createHash('md5').update(params).digest('hex');
  const dataToSign = method + params + md5;
  const hmac = crypto.createHmac('sha1', SECRET).update(dataToSign).digest('hex');
  const signature = Buffer.from(hmac).toString('base64');

  try {
    const response = await fetch(`https://api.zadarma.com${method}?${params}`, {
      headers: {
        'Authorization': `${KEY}:${signature}`
      },
      cache: 'no-store' // Obligamos a que siempre traiga una llave nueva
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error contactando a Zadarma:", error);
    return NextResponse.json({ error: "Falla de red" }, { status: 500 });
  }
}