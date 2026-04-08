import { Request, Response, NextFunction } from 'express';
import { ThreatService } from '../../../application/services/threat.service';
import { logger } from '../../../infrastructure/config/logger';
import { ServiceFactory } from '../../../infrastructure/factories/ServiceFactory';

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  reported: boolean;
}

const loginAttempts = new Map<string, LoginAttempt>();

let threatService: ThreatService;

function getThreatService(): ThreatService {
  if (!threatService) {
    threatService = ServiceFactory.getThreatService();
  }
  return threatService;
}

const MAX_ATTEMPTS = 5;
const TIME_WINDOW = 5 * 60 * 1000; // 5 minutos

export function resetBruteForceState(): void {
  loginAttempts.clear();
}

export function getBruteForceState(): Map<string, LoginAttempt> {
  return new Map(loginAttempts);
}

export function bruteForceDetection(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.reported && (Date.now() - attempt.firstAttempt < TIME_WINDOW)) {
    logger.warn('Blocking request from blacklisted IP', { ip });
    res.status(403).json({ 
      error: 'Access denied due to multiple failed attempts. Try again later.' 
    });
    return;
  }
  const originalJson = res.json.bind(res);
  
  res.json = function(body: unknown) {
    if (req.path === '/login') {
      if (res.statusCode === 401) {
        trackFailedAttempt(ip, req.body?.username);
      } else if (res.statusCode === 200) {
        loginAttempts.delete(ip);
      }
    }
    return originalJson(body);
  };
  
  next();
}

async function trackFailedAttempt(ip: string, username?: string) {
  const now = Date.now();
  let attempt = loginAttempts.get(ip);

  if (!attempt) {
    attempt = { count: 1, firstAttempt: now, reported: false };
    loginAttempts.set(ip, attempt);
    return;
  }

  if (now - attempt.firstAttempt > TIME_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, reported: false });
    return;
  }

  attempt.count++;

  if (attempt.count >= MAX_ATTEMPTS && !attempt.reported) {
    attempt.reported = true;
    

    const service = getThreatService();
    
    await service.reportThreat({
      type: 'intrusion',
      severity: 'high',
      sourceIp: ip,
      description: `Brute force attack detected: ${attempt.count} failed login attempts in 5 minutes`,
      metadata: {
        attempts: attempt.count,
        username: username || 'unknown',
        detectedAt: new Date().toISOString(),
        autoDetected: true
      }
    });

    logger.warn('Brute force attack detected and reported', {
      ip,
      attempts: attempt.count,
      username
    });
  }
}

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (now - attempt.firstAttempt > TIME_WINDOW) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export function stopBruteForceCleanup(): void {
  clearInterval(cleanupInterval);
}