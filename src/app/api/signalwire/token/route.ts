// src/app/api/signalwire/token/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const spaceUrl = process.env.SIGNALWIRE_SPACE_URL;      // ej: coyote-textil.signalwire.com
    const projectId = process.env.SIGNALWIRE_PROJECT_ID;    // UUID
    const apiToken = process.env.SIGNALWIRE_API_TOKEN;      // PTxxxx...
    const identity = 'coyote_agent_01';

    if (!spaceUrl || !projectId || !apiToken) {
      return NextResponse.json(
        { ok: false, error: 'Faltan variables SIGNALWIRE_SPACE_URL / SIGNALWIRE_PROJECT_ID / SIGNALWIRE_API_TOKEN' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${projectId}:${apiToken}`).toString('base64');

    const url = `https://${spaceUrl}/api/relay/rest/jwt`;
    const swRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        expires_in: 3600,
        resource: identity
      })
    });

    const contentType = swRes.headers.get('content-type') || '';
    const raw = await swRes.text();

    if (!swRes.ok) {
      console.error('SignalWire JWT error:', swRes.status, raw);
      return NextResponse.json(
        { ok: false, error: 'SignalWire no autorizó el JWT', status: swRes.status, details: raw },
        { status: swRes.status }
      );
    }

    const data = contentType.includes('application/json') ? JSON.parse(raw) : null;

    const token = data?.jwt_token;
    if (!token) {
      console.error('SignalWire JWT missing jwt_token:', raw);
      return NextResponse.json(
        { ok: false, error: 'Respuesta inválida: falta jwt_token', details: raw },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      token,
      identity,
      projectId
    });
  } catch (err: any) {
    console.error('Token route crash:', err?.message || err, err);
    return NextResponse.json(
      { ok: false, error: 'Error interno generando token' },
      { status: 500 }
    );
  }
}
