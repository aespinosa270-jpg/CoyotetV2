// src/app/crm/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ClientDashboard from './ClientDashboard';

// ============================================================================
// DATA MASKING
// ============================================================================
const maskEmail = (email: string | null): string => {
  if (!email) return 'Sin correo';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName = name.length > 3 ? `${name.substring(0, 3)}••••` : `${name}••••`;
  const [tld, ext = 'com'] = domain.split('.');
  const maskedDomain = tld.length > 3 ? `${tld.substring(0, 3)}••••.${ext}` : `••••.${ext}`;
  return `${maskedName}@${maskedDomain}`;
};

const maskPhone = (phone: string | null): string => {
  if (!phone) return 'Sin teléfono';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 4 ? `+52 55 •••• ${cleaned.slice(-4)}` : '••••••••';
};

const maskAddress = (address: string | null): string => {
  if (!address?.trim()) return 'Dirección B2B protegida';
  return address.replace(/([A-Z][a-z]{2,})\w+/g, '$1••••');
};

const dateFormat = (date: Date, withTime = false): string =>
  new Intl.DateTimeFormat('es-MX', {
    year: 'numeric', month: 'short', day: '2-digit',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  }).format(date);

// ============================================================================
// PAGE — ZERO-TRUST AUTH + DATA FETCH
// ============================================================================
export default async function CRMPage() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const session = cookieStore.get('coyote_crm_session');

  if (!session?.value) redirect('/crm/login');

  const employee = await prisma.employee.findUnique({
    where: { id: session.value },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!employee?.isActive) redirect('/crm/login');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [rawUsers, rawOrders] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { hashId: true, name: true } },
        items: true,
      },
    }),
  ]);

  // ── Transforms ────────────────────────────────────────────────────────────
  const safeCustomers = rawUsers.map(user => {
    const fullAddress = [user.street, user.neighborhood, user.city, user.state]
      .filter(Boolean).join(', ');
    return {
      id: user.hashId,
      name: user.name || 'Empresa sin nombre',
      safeEmail: maskEmail(user.email),
      safePhone: maskPhone(user.phone),
      safeAddress: maskAddress(fullAddress),
      ltv: user.ltv,
      membership: user.role,
      optedIn: user.optedIn,
      orders: user.orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        date: dateFormat(o.createdAt),
      })),
    };
  });

  const globalOrders = rawOrders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.user.hashId,
    customerName: o.customerName || o.user.name || 'Desconocido',
    email: o.customerEmail,
    phone: o.customerPhone || 'Sin teléfono',
    address: o.address || 'Dirección no especificada',
    total: o.total,
    status: o.status,
    logisticsType: o.logisticsType,
    vehiclesNeeded: o.vehiclesNeeded,
    date: dateFormat(o.createdAt, true),
    items: o.items.map(i => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      unit: i.unit || 'PZA',
      color: i.color || 'N/A',
    })),
  }));

  return (
    <ClientDashboard
      customers={safeCustomers}
      globalOrders={globalOrders}
      employeeName={employee.name}
      employeeRole={employee.role}
    />
  );
}