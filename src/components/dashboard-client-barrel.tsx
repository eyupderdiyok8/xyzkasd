// Client bileşenlerini tek bir ara dosyada topluyoruz.
// Bu sayede (dashboard)/page.tsx saf bir Server Component kalır,
// Vercel'in lstat hatası tetiklenmez.
'use client';

export { default as DashboardStats } from './DashboardStats';
export { default as MaintenanceReminders } from './MaintenanceReminders';
export { default as OverdueQueue } from './OverdueQueue';
