import Link from 'next/link';

export default function UpgradePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900">Üyelik Süreniz Doldu</h1>
          <p className="mt-3 text-sm text-gray-600">
            Sistem özelliklerine erişmek için üyeliğinizi yenilemeniz gerekiyor.
            Yöneticinizle iletişime geçerek üyelik sürenizi uzatabilirsiniz.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/dashboard"
              className="block w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Gösterge Paneline Dön
            </Link>
            <Link
              href="/settings"
              className="block w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hesap Ayarları
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
