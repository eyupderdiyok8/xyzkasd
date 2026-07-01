'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  collapsed: boolean;
}

export default function UserMenu({ collapsed }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleCikis() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleCikis}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title="Çıkış Yap"
    >
      <LogOut className="h-3.5 w-3.5 shrink-0" />
      {!collapsed && <span>Çıkış Yap</span>}
    </button>
  );
}
