// src/app/api/shipping/quote/route.ts
import { NextResponse } from 'next/server';

// Generador de Token OAuth2
async function getSkydropxToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.SKYDROPX_CLIENT_ID || '');
  params.append('client_secret', process.env.SKYDROPX_CLIENT_SECRET || '');

  const res = await fetch('https://pro.skydropx.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(), 
  });

  if (!res.ok) throw new Error('Error de autenticación con SkydropX');
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Agregamos cartItems para armar los paquetes dinámicamente
    const { zip_to, state_to, city_to, neighborhood_to, cartItems } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    const accessToken = await getSkydropxToken();

    // 🐺 LÓGICA DE EMPAQUETADO DEL COYOTE
    const parcels: any[] = [];
    let looseWeight = 0; // Kilos sueltos

    cartItems.forEach((item: any) => {
      if (item.meta?.mode === "rollo") {
        // Por cada rollo generamos un "parcel" físico de 25kg cilíndrico
        // Tomamos el número de rollos (que está en item.meta.packages, o lo calculamos dividiendo el peso total / 25)
        const numberOfRolls = item.meta?.packages || Math.ceil(item.quantity / 25);
        for (let i = 0; i < numberOfRolls; i++) {
          parcels.push({
            weight: 25, 
            length: 160, 
            width: 25,   
            height: 25
          });
        }
      } else {
        // Los kilos o metros sueltos los sumamos
        looseWeight += item.quantity;
      }
    });

    // Si hay kilos sueltos, armamos cajas consolidadas (máximo 30kg por caja para que las paqueterías no lloren)
    if (looseWeight > 0) {
      const cajasNecesarias = Math.ceil(looseWeight / 30);
      const pesoPorCaja = looseWeight / cajasNecesarias;

      for (let i = 0; i < cajasNecesarias; i++) {
        parcels.push({
          weight: Math.max(1, pesoPorCaja),
          length: 50, 
          width: 50,
          height: 50
        });
      }
    }

    const payload = {
      quotation: {
        address_from: {
          country_code: "MX",
          postal_code: process.env.WAREHOUSE_ZIP || "06000",
          area_level1: "Ciudad de México",
          area_level2: "Venustiano Carranza",
          area_level3: "Moctezuma 2da Secc"
        },
        address_to: {
          country_code: "MX",
          postal_code: zip_to.toString(),
          area_level1: state_to || "Nuevo León",
          area_level2: city_to || "Monterrey",
          area_level3: neighborhood_to || "Centro"
        },
        parcels: parcels // 🔥 AQUÍ PASAMOS LA LISTA REAL DE PAQUETES
      }
    };

    // 1. CREAMOS LA COTIZACIÓN
    const res = await fetch('https://pro.skydropx.com/api/v1/quotations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Error al crear cotización Skydropx:", err)
      return NextResponse.json({ error: 'SkydropX rechazó la dirección.' }, { status: 400 });
    }

    let data = await res.json();
    const quotationId = data.id; 
    
    console.log(`⏳ Cotización creada (ID: ${quotationId}). Esperando a las paqueterías...`);

    // 2. EL CICLO DE ESPERA (POLLING)
    let isCompleted = data.is_completed;
    let attempts = 0;
    const MAX_ATTEMPTS = 12; 

    while (!isCompleted && attempts < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pollRes = await fetch(`https://pro.skydropx.com/api/v1/quotations/${quotationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (pollRes.ok) {
        data = await pollRes.json();
        isCompleted = data.is_completed;
        console.log(`⏱️ Intento ${attempts + 1}: ¿Terminó? ${isCompleted ? 'SÍ ✅' : 'NO ❌'}`);
      }
      attempts++;
    }

    if (!isCompleted) {
      console.log('⚠️ Timeout: SkydropX tardó demasiado.');
      return NextResponse.json({ error: 'El servidor de paqueterías está tardando. Intenta de nuevo.' }, { status: 408 });
    }

    // 3. AHORA SÍ FILTRAMOS LOS PRECIOS REALES
    const rates = data.rates || [];
    const validQuotes = rates
      .filter((q: any) => parseFloat(q.total || q.amount) > 0)
      .sort((a: any, b: any) => parseFloat(a.total || a.amount) - parseFloat(b.total || b.amount));

    if (validQuotes.length === 0) {
      return NextResponse.json({ error: 'Ninguna paquetería devolvió cobertura para este CP.' }, { status: 400 });
    }

    // Tomamos a la paquetería más barata
    const ganador = validQuotes[0];
    const precioFinal = parseFloat(ganador.total || ganador.amount);

    console.log(`🏆 GANDOR: ${ganador.provider_display_name} por $${precioFinal}`);

    return NextResponse.json({
      success: true,
      bestQuote: {
        amount: precioFinal,
        carrier: ganador.provider_display_name || ganador.provider_name,
        days: ganador.days || 3,
        rateId: ganador.id // MUY IMPORTANTE: Retornar el ID para luego comprar la guía si lo deseas
      }
    });

  } catch (error: any) {
    console.error('Error del servidor:', error.message);
    return NextResponse.json({ error: 'Error de red conectando con SkydropX.' }, { status: 500 });
  }
}