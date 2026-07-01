'use client';
import Link from 'next/link';
const SL: Record<string, string> = { ACTIVE: 'Aktif', PASSIVE: 'Pasif', SCRAP: 'Hurda' };
const SC: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-800', PASSIVE: 'bg-yellow-100 text-yellow-800', SCRAP: 'bg-red-100 text-red-800' };
export default function DevicesTable({ devices }: { devices: any[] }) {
  if (!devices.length) return (
    <div className="rounded-lg border border-border bg-white p-12 text-center">
      <h3 className="text-lg font-medium text-foreground">Henuz cihaz bulunmuyor</h3>
      <p className="mt-2 text-sm text-gray-500">Ilk cihazinizi ekleyerek baslayin.</p>
      <Link href="/devices/new" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Cihaz Ekle</Link>
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr><th className="px-4 py-3 text-left font-medium text-gray-500">QR</th><th className="px-4 py-3 text-left font-medium text-gray-500">Marka / Model</th><th className="px-4 py-3 text-left font-medium text-gray-500">Seri No</th><th className="px-4 py-3 text-left font-medium text-gray-500">Musteri</th><th className="px-4 py-3 text-left font-medium text-gray-500">Garanti</th><th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th><th className="px-4 py-3 text-center font-medium text-gray-500">TDS</th><th className="px-4 py-3" /></tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {devices.map((d: any) => {
            const expired = d.warrantyEnd && new Date(d.warrantyEnd) < new Date();
            return (<tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3"><code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{d.qrCode ?? '---'}</code></td>
              <td className="px-4 py-3"><span className="font-medium">{d.brand}</span><span className="text-gray-400"> / </span><span className="text-gray-600">{d.model}</span></td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.serialNo}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.customer?.name ?? '---'}</td>
              <td className="px-4 py-3">{d.warrantyEnd ? <span className={'text-xs ' + (expired ? 'text-red-600 font-medium' : 'text-gray-600')}>{new Date(d.warrantyEnd).toLocaleDateString('tr-TR')}{expired && ' (bitti)'}</span> : '---'}</td>
              <td className="px-4 py-3"><span className={'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' + (SC[d.status] ?? 'bg-gray-100')}>{SL[d.status] ?? d.status}</span></td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">{d._count?.tdsReadings ?? 0}</td>
              <td className="px-4 py-3 text-right"><Link href={'/devices/' + d.id} className="text-sm font-medium text-blue-600 hover:text-blue-800">Detay</Link></td>
            </tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}

