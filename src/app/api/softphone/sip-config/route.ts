import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const wsUri = process.env.SIGNALWIRE_SIP_WS_URI;
  const sipDomain = process.env.SIGNALWIRE_SIP_DOMAIN;
  const dappDomain = process.env.SIGNALWIRE_DAPP_DOMAIN;
  const username = process.env.SIGNALWIRE_SIP_USERNAME;
  const password = process.env.SIGNALWIRE_SIP_PASSWORD;
  const callerId = process.env.SIGNALWIRE_PHONE_NUMBER || null;

  if (!wsUri || !sipDomain || !dappDomain || !username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Faltan variables SIP/DAPP' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    wsUri,
    sipDomain,
    dappDomain,
    username,
    password,
    passwordLen: password.length,
    callerId
  });
}