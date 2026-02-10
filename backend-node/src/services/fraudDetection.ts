import { PrismaClient } from "@prisma/client";
import { Request } from "express";

const prisma = new PrismaClient();

interface FraudSignals {
  ip: string;
  userAgent: string;
  deviceFingerprint?: string;
  geo: GeoData;
  isVpn?: boolean;
  isTor?: boolean;
  isProxy?: boolean;
  isDatacenter?: boolean;
}

interface GeoData {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  lat?: number;
  lon?: number;
}

interface FraudResult {
  score: number;
  reasons: string[];
  shouldBlock: boolean;
  signals: FraudSignals;
}

const VPN_PATTERNS = [
  /vpn/i,
  /proxy/i,
  /tor/i,
  /anonymous/i,
  /hide/i,
  /tunnel/i,
];

const DATACENTER_ASNS = [
  "Amazon",
  "Google",
  "Microsoft",
  "Digital Ocean",
  "Linode",
  "Vultr",
  "OVH",
  "Hetzner",
  "Cloudflare",
  "DigitalOcean",
];

const BOT_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /curl/i,
  /wget/i,
];

export function extractFraudSignals(req: Request): FraudSignals {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  const deviceFingerprint =
    (req.headers["x-device-fingerprint"] as string) ||
    req.body?.device_fingerprint ||
    generateBasicFingerprint(req);

  return {
    ip,
    userAgent,
    deviceFingerprint,
    geo: extractGeoFromHeaders(req),
    isVpn: checkVpnIndicators(req),
    isTor: checkTorIndicators(ip),
    isProxy: checkProxyIndicators(req),
    isDatacenter: false,
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") {
    return realIp;
  }
  return req.socket.remoteAddress || "unknown";
}

function extractGeoFromHeaders(req: Request): GeoData | undefined {
  const cfCountry = req.headers["cf-ipcountry"] as string;
  const cfCity = req.headers["cf-ipcity"] as string;
  const cfRegion = req.headers["cf-ipregion"] as string;
  const cfTimezone = req.headers["cf-timezone"] as string;

  if (cfCountry || cfCity) {
    return {
      country: cfCountry,
      city: cfCity,
      region: cfRegion,
      timezone: cfTimezone,
    };
  }

  return undefined;
}

function generateBasicFingerprint(req: Request): string {
  const ua = req.headers["user-agent"] || "";
  const lang = req.headers["accept-language"] || "";
  const encoding = req.headers["accept-encoding"] || "";

  const components = [ua, lang, encoding].join("|");
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function checkVpnIndicators(req: Request): boolean {
  const via = req.headers["via"];
  const xForwardedFor = req.headers["x-forwarded-for"];

  if (via && VPN_PATTERNS.some((p) => p.test(via as string))) {
    return true;
  }

  if (
    xForwardedFor &&
    typeof xForwardedFor === "string" &&
    xForwardedFor.split(",").length > 3
  ) {
    return true;
  }

  return false;
}

function checkTorIndicators(ip: string): boolean {
  if (ip.endsWith(".onion") || ip.includes("tor")) {
    return true;
  }
  return false;
}

function checkProxyIndicators(req: Request): boolean {
  const proxyHeaders = [
    "x-proxy-id",
    "x-proxy-connection",
    "proxy-connection",
    "x-bluecoat-via",
  ];

  return proxyHeaders.some((h) => !!req.headers[h]);
}

function isBotUserAgent(userAgent: string): boolean {
  return BOT_USER_AGENTS.some((pattern) => pattern.test(userAgent));
}

export async function analyzeClickFraud(
  userId: number,
  productId: number,
  signals: FraudSignals,
): Promise<{ fraudulent: boolean; score: number; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentClicksSameProduct = await prisma.affiliateClick.count({
    where: {
      user_id: userId,
      product_id: productId,
      created_at: { gte: fiveMinutesAgo },
    },
  });

  if (recentClicksSameProduct >= 5) {
    return {
      fraudulent: true,
      score: 100,
      reason: "Excessive clicks on same product in short period",
    };
  }

  const recentClicksSameIp = await prisma.affiliateClick.count({
    where: {
      ip_address: signals.ip,
      created_at: { gte: oneHourAgo },
    },
  });

  if (recentClicksSameIp >= 50) {
    return {
      fraudulent: true,
      score: 90,
      reason: "Excessive clicks from same IP",
    };
  }

  if (isBotUserAgent(signals.userAgent)) {
    return { fraudulent: true, score: 95, reason: "Bot user agent detected" };
  }

  if (signals.isVpn || signals.isTor || signals.isProxy) {
    return {
      fraudulent: false,
      score: 40,
      reason: "VPN/Proxy detected - flagged for review",
    };
  }

  return { fraudulent: false, score: 0 };
}

export async function detectAdvancedFraud(
  userId: number,
  action: string,
  signals: FraudSignals,
): Promise<FraudResult> {
  const reasons: string[] = [];
  let score = 0;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return {
      score: 0,
      reasons: ["User not found"],
      shouldBlock: false,
      signals,
    };
  }

  if (isBotUserAgent(signals.userAgent)) {
    score += 50;
    reasons.push("Bot user agent detected");
  }

  if (signals.isVpn) {
    score += 20;
    reasons.push("VPN detected");
  }

  if (signals.isTor) {
    score += 40;
    reasons.push("Tor exit node detected");
  }

  if (signals.isProxy) {
    score += 15;
    reasons.push("Proxy detected");
  }

  if (signals.isDatacenter) {
    score += 25;
    reasons.push("Datacenter IP detected");
  }

  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      user_id: userId,
      created_at: { gte: oneDay },
    },
  });

  const uniqueIps = new Set(
    recentLogs.map((l) => l.ip_address).filter(Boolean),
  );
  if (uniqueIps.size > 10) {
    score += 35;
    reasons.push(`Excessive IP diversity: ${uniqueIps.size} unique IPs in 24h`);
  }

  const uniqueFingerprints = new Set(
    recentLogs
      .map((l) => (l.details as any)?.device_fingerprint)
      .filter(Boolean),
  );
  if (uniqueFingerprints.size > 5) {
    score += 30;
    reasons.push(
      `Multiple device fingerprints: ${uniqueFingerprints.size} devices in 24h`,
    );
  }

  if (signals.geo?.country) {
    const recentGeos = recentLogs
      .map((l) => (l.details as any)?.geo?.country)
      .filter(Boolean);

    const uniqueCountries = new Set(recentGeos);
    if (uniqueCountries.size > 3) {
      score += 40;
      reasons.push(
        `Impossible travel: ${uniqueCountries.size} countries in 24h`,
      );
    }
  }

  if (action === "withdrawal") {
    const withdrawalCount = await prisma.withdrawalRequest.count({
      where: {
        user_id: userId,
        created_at: { gte: oneDay },
      },
    });

    if (withdrawalCount > 3) {
      score += 25;
      reasons.push(`Excessive withdrawal attempts: ${withdrawalCount} in 24h`);
    }
  }

  const oneHour = new Date(Date.now() - 60 * 60 * 1000);
  const clickVelocity = await prisma.affiliateClick.count({
    where: {
      user_id: userId,
      created_at: { gte: oneHour },
    },
  });

  if (clickVelocity > 100) {
    score += 50;
    reasons.push(`Abnormal click velocity: ${clickVelocity} clicks/hour`);
  } else if (clickVelocity > 50) {
    score += 25;
    reasons.push(`High click velocity: ${clickVelocity} clicks/hour`);
  }

  const selfReferralCheck = await checkSelfReferral(userId, signals.ip);
  if (selfReferralCheck.isSelfReferral) {
    score += 60;
    reasons.push("Self-referral pattern detected");
  }

  return {
    score,
    reasons,
    shouldBlock: score >= 70,
    signals,
  };
}

async function checkSelfReferral(
  userId: number,
  ip: string,
): Promise<{ isSelfReferral: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referred_by: true, email: true },
  });

  if (!user?.referred_by) {
    return { isSelfReferral: false };
  }

  const referrer = await prisma.user.findFirst({
    where: { referral_code: user.referred_by },
    select: { id: true, last_ip: true },
  });

  if (referrer && referrer.last_ip === ip) {
    return { isSelfReferral: true, reason: "Same IP as referrer" };
  }

  return { isSelfReferral: false };
}

export async function logFraudEvent(
  userId: number,
  action: string,
  signals: FraudSignals,
  fraudScore: number,
  reasons: string[],
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: `fraud_check_${action}`,
        ip_address: signals.ip,
        details: {
          user_agent: signals.userAgent,
          device_fingerprint: signals.deviceFingerprint,
          geo: JSON.parse(JSON.stringify(geoData)),
          is_vpn: signals.isVpn,
          is_tor: signals.isTor,
          is_proxy: signals.isProxy,
          fraud_reasons: reasons,
        },
        fraud_score: fraudScore,
        flagged: fraudScore >= 50,
      },
    });

    if (fraudScore > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          fraud_score: { increment: Math.floor(fraudScore / 10) },
          last_ip: signals.ip,
        },
      });
    }
  } catch (error) {
    console.error("Failed to log fraud event:", error);
  }
}

export async function blockFraudulentUser(
  userId: number,
  reason: string,
  adminId?: number,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      is_blocked: true,
      block_reason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: userId,
      action: "user_blocked_fraud",
      details: { reason, blocked_by: adminId || "system" },
    },
  });
}
