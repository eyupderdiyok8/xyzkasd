'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpenText, Building2, Database, Palette, Shield, Users, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdminSectionId = 'users' | 'company' | 'widget' | 'data' | 'membership' | 'blog' | 'system';

export interface AdminSection {
  id: AdminSectionId;
  title: string;
  description: string;
  children: ReactNode;
}

const ICONS: Record<AdminSectionId, React.ElementType> = {
  users: Users,
  company: Building2,
  widget: Palette,
  data: Database,
  membership: WalletCards,
  blog: BookOpenText,
  system: Shield,
};

export default function AdminTabs({ sections }: { sections: AdminSection[] }) {
  const [activeId, setActiveId] = useState<AdminSectionId>(sections[0]?.id ?? 'users');
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? sections[0],
    [activeId, sections],
  );

  if (!activeSection) return null;

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div
          role="tablist"
          aria-label="Admin panel bölümleri"
          className="flex min-w-max gap-2 rounded-lg border border-border bg-card p-1 shadow-card md:min-w-0 md:flex-wrap"
        >
          {sections.map((section) => {
            const Icon = ICONS[section.id];
            const selected = activeSection.id === section.id;

            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(section.id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{activeSection.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeSection.description}</p>
          </div>
        </div>

        <div className="space-y-6">{activeSection.children}</div>
      </section>
    </div>
  );
}
