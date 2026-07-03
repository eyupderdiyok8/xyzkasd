import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * QR kod tarama sayfası.
 *
 * QR kod URL formatı: https://site.com/qr/QR-XXXXXXXXXXXX
 *
 * - Giriş yapmış teknisyen/teknisyen üstü → direkt cihaz detayına yönlenir
 * - Giriş yapmamış kullanıcı → cihaz bilgisi ve servis geçmişi gösterilir
 */
export default async function QrPage({ params }: Props) {
  const { code } = await params;

  // Cihazı QR kod ile bul
  const device = await prisma.device.findUnique({
    where: { qrCode: code, deletedAt: null },
    select: {
      id: true,
      serialNo: true,
      brand: true,
      model: true,
      status: true,
      warrantyStart: true,
      warrantyEnd: true,
      installDate: true,
      tenant: { select: { id: true, name: true, logo: true, phone: true, email: true } },
      serviceTickets: {
        include: { technician: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: { select: { serviceTickets: true } },
    },
  });

  if (!device) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Cihaz Bulunamadı</h1>
          <p className="mt-2 text-sm text-slate-500">Bu QR koda ait aktif bir cihaz kaydı bulunamadı.</p>
        </div>
      </div>
    );
  }

  // Giriş yapmış kullanıcı varsa cihaz detayına yönlendir
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(`/devices/${device.id}`);
  }

  // Giriş yapmamış kullanıcı için public cihaz bilgisi
  const ticketCount = device._count.serviceTickets;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Tenant Header */}
        {device.tenant.logo && (
          <div className="mb-6 flex justify-center">
            <img src={device.tenant.logo} alt={device.tenant.name} className="h-16 object-contain" />
          </div>
        )}
        <h2 className="text-center text-sm font-medium text-slate-500">{device.tenant.name}</h2>

        {/* Device Card */}
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">
            {device.brand} {device.model}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Seri No: {device.serialNo}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400">Durum</span>
              <p className={`font-semibold ${device.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}>
                {device.status === 'ACTIVE' ? 'Aktif' : device.status}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400">Servis Kaydı</span>
              <p className="font-semibold text-slate-900">{ticketCount}</p>
            </div>
            {device.installDate && (
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Kurulum</span>
                <p className="font-semibold text-slate-900">
                  {new Date(device.installDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}
            {device.warrantyEnd && (
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-400">Garanti Bitiş</span>
                <p className={`font-semibold ${new Date(device.warrantyEnd) > new Date() ? 'text-green-600' : 'text-red-500'}`}>
                  {new Date(device.warrantyEnd).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Service History */}
        {device.serviceTickets.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Son Servis Kayıtları</h3>
            <div className="space-y-2">
              {device.serviceTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{ticket.ticketNo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ticket.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {ticket.status === 'COMPLETED' ? 'Tamamlandı' :
                       ticket.status === 'PENDING' ? 'Bekliyor' : ticket.status}
                    </span>
                  </div>
                  {ticket.issueDesc && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ticket.issueDesc}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span>{new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</span>
                    {ticket.technician?.name && <span>👨‍🔧 {ticket.technician.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          {device.tenant.phone && <span>{device.tenant.phone} · </span>}
          {device.tenant.email && <span>{device.tenant.email}</span>}
        </p>
      </div>
    </div>
  );
}
