import type { NextRequest } from 'next/server';

/**
 * Extract the client IP address from a NextRequest.
 * Checks common proxy headers in order.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first is the client IP
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  return null;
}
