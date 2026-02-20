// src/app/crm/page.tsx
import React from 'react';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientDashboard from './ClientDashboard';

const prisma = new PrismaClient();

// ============================================================================
// 1. MOTOR DE DATA MASKING
// ============================================================================
const maskEmail = (email: string | null) => {
  if (!email) return 'Sin correo';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName = name.length > 3 ? name.substring(0, 3) + '••••' : name + '••••';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].length > 3 
    ? domainParts[0].substring(0, 3) + '••••.' + (domainParts[1] || 'com')
    : '••••.' + (domainParts[1] || 'com');
  return `${maskedName}@${maskedDomain}`;
};

const maskPhone = (phone: string | null) => {
  if (!phone) return 'Sin teléfono';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `+52 55 •••• ${last4}`;
  }
  return '••••••••';
};

const maskAddress = (address: string | null) => {
  if (!address || address.trim() === '') return 'Dirección B2B protegida';
  return address.replace(/([A-Z][a-z]{2,})\w+/g, '$1••••'); 
};

// ============================================================================
// 2. EXTRACCIÓN Y VERIFICACIÓN DE IDENTIDAD
// ============================================================================
export default async function CRMPage() {
  
  // 🔥 PROTOCOLO ZERO-TRUST: Verificamos si existe la cookie de empleado (CON AWAIT)
  const cookieStore = await cookies();
  const session = cookieStore.get('coyote_crm_session');

  // Si no hay cookie, lo pateamos al Login
  if (!session || !session.value) {
    redirect('/crm/login');
  }

  // Buscamos al empleado en la base de datos con esa cookie
  const employee = await prisma.employee.findUnique({
    where: { id: session.value }
  });

  // Si el empleado no existe o fue desactivado (Kill Switch) -> Al login
  if (!employee || !employee.isActive) {
    redirect('/crm/login');
  }

  // -------------------------------------------------------------------------
  // SI LLEGA HASTA AQUÍ, ESTÁ AUTENTICADO. SACAMOS LA DATA.
  // -------------------------------------------------------------------------

  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } }
  });

  const rawOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      user: { select: { hashId: true, name: true } },
      items: true 
    }
  });

  const safeCustomers = rawUsers.map(user => {
    const fullAddress = [user.street, user.neighborhood, user.city, user.state].filter(Boolean).join(', ');
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
        date: new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: '2-digit' }).format(o.createdAt)
      }))
    };
  });

  const globalOrders = rawOrders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.user.hashId,
    customerName: o.customerName || o.user.name || 'Desconocido',
    email: o.customerEmail,
    phone: o.customerPhone,
    address: o.address || 'Dirección no especificada',
    total: o.total,
    status: o.status,
    logisticsType: o.logisticsType,
    vehiclesNeeded: o.vehiclesNeeded,
    date: new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(o.createdAt),
    items: o.items.map(i => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      unit: i.unit || 'PZA',
      color: i.color || 'N/A'
    }))
  }));

  // Pasamos TODO al Frontend, incluyendo quién es el empleado logueado
  return (
    <ClientDashboard 
      customers={safeCustomers} 
      globalOrders={globalOrders.map(order => ({
        ...order,
        phone: order.phone || "Sin teléfono"
      }))} 
      employeeName={employee.name} 
      employeeRole={employee.role} 
    />
  );
}