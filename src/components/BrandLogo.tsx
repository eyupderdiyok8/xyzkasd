import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export default function BrandLogo({ className, imageClassName, priority = false }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Image
        src="/brand/su-aritma-servis-yazilimi-logo.png"
        alt="Su Arıtma Servis Yazılımı"
        width={424}
        height={140}
        priority={priority}
        className={cn('h-auto w-full object-contain', imageClassName)}
      />
    </span>
  );
}
