import type { Request } from 'express';

export function getClientIp(req: Request): string {
  const resolvedIp = req.ip || req.socket.remoteAddress;

  if (resolvedIp) {
    return resolvedIp;
  }

  return 'unknown';
}
