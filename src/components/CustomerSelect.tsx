'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface PhoneInfo {
  id: string;
  label: string;
  number: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  phones?: PhoneInfo[];
}

interface CustomerSelectProps {
  value: string;
  onChange: (customerId: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CustomerSelect({
  value,
  onChange,
  className = '',
  placeholder = 'Müşteri ara...',
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch selected customer name on mount
  useEffect(() => {
    if (!value) return;
    fetch(`/api/customers/${value}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setSelectedCustomer(json.data);
      })
      .catch(() => {});
  }, [value]);

  const displayPhone = (c: CustomerOption): string =>
    c.phones && c.phones.length > 0 ? c.phones[0].number : c.phone;

  // Search customers
  const fetchCustomers = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set('search', term);
      params.set('showAll', 'true');
      const res = await fetch(`/api/customers?${params.toString()}`);
      const json = await res.json();
      setCustomers(json.data ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(search), 200);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    onChange(customer.id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    onChange('');
    setSearch('');
  };

  const cls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Selected customer badge */}
      {selectedCustomer ? (
        <div className={`${cls} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-foreground">{selectedCustomer.name}</span>
            {displayPhone(selectedCustomer) && (
              <span className="text-gray-400 text-xs">{displayPhone(selectedCustomer)}</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
            >
              Değiştir
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
            >
              Kaldır
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${cls} flex items-center gap-2 text-left text-gray-400`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {placeholder}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya telefon ara..."
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loading && customers.length === 0 && (
              <div className="px-4 py-3 text-center text-xs text-gray-400">
                Aranıyor...
              </div>
            )}
            {!loading && customers.length === 0 && (
              <div className="px-4 py-3 text-center text-xs text-gray-400">
                {search ? 'Müşteri bulunamadı' : 'Müşteri bulunmuyor'}
              </div>
            )}
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                  value === c.id ? 'bg-blue-50' : ''
                }`}
              >
                <div>
                  <span className="font-medium text-foreground">{c.name}</span>
                  {displayPhone(c) && (
                    <span className="ml-2 text-xs text-gray-400">{displayPhone(c)}</span>
                  )}
                </div>
                {value === c.id && (
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
