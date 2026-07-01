'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ end, duration = 1200, prefix = '', suffix = '', className }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const startTime = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(end);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{count.toLocaleString('tr-TR')}{suffix}
    </span>
  );
}

interface TrendDeltaProps {
  value: number; // percentage change
  className?: string;
}

export function TrendDelta({ value, className = '' }: TrendDeltaProps) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const color = isFlat ? 'text-muted-foreground' : isUp ? 'text-success' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color} ${className}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

export function GreetingCard({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => { setNow(new Date()); }, []);

  const hour = now?.getHours() ?? 12;
  const greeting =
    hour < 6 ? 'İyi geceler' :
    hour < 12 ? 'Günaydın' :
    hour < 18 ? 'İyi günler' :
    'İyi akşamlar';

  const dateStr = now?.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) ?? '';

  return (
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-primary/8 via-primary/3 to-background">
      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

      <CardContent className="relative p-6 lg:p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {greeting}
            </p>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
              {name}
            </h2>
            <p className="text-sm text-muted-foreground capitalize">
              {dateStr}
            </p>
          </div>
          <div className="hidden lg:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
