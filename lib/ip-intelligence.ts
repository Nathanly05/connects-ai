type IpInfoPrivacyResponse = {
  vpn?: boolean;
  proxy?: boolean;
  tor?: boolean;
  relay?: boolean;
  hosting?: boolean;
  service?: string;
  error?: {
    title?: string;
    message?: string;
  };
};

type IpInfoLookupResponse = {
  is_anonymous?: boolean;
  is_hosting?: boolean;
  error?: {
    title?: string;
    message?: string;
  };
};

export type IpIntelligenceResult = {
  checked: boolean;
  provider: "ipinfo" | null;
  suspicious: boolean;
  reason: string | null;
  data: Record<string, unknown>;
};

const timeoutMs = 2500;

function isPrivateOrLocalIp(ipAddress: string) {
  return (
    ipAddress === "unknown" ||
    ipAddress === "::1" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress)
  );
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkIpIntelligence(ipAddress: string): Promise<IpIntelligenceResult> {
  const token = process.env.IPINFO_TOKEN;

  if (!token || isPrivateOrLocalIp(ipAddress)) {
    return {
      checked: false,
      provider: token ? "ipinfo" : null,
      suspicious: false,
      reason: token ? "local_or_unknown_ip" : "ipinfo_not_configured",
      data: {}
    };
  }

  const encodedIp = encodeURIComponent(ipAddress);
  const encodedToken = encodeURIComponent(token);
  const privacy = await fetchJson<IpInfoPrivacyResponse>(
    `https://ipinfo.io/${encodedIp}/privacy?token=${encodedToken}`
  );

  if (privacy && !privacy.error) {
    const matchedFlags = [
      privacy.vpn ? "vpn" : null,
      privacy.proxy ? "proxy" : null,
      privacy.tor ? "tor" : null,
      privacy.relay ? "relay" : null,
      privacy.hosting ? "hosting" : null
    ].filter(Boolean);

    return {
      checked: true,
      provider: "ipinfo",
      suspicious: matchedFlags.length > 0,
      reason: matchedFlags.join(",") || null,
      data: privacy as Record<string, unknown>
    };
  }

  const lookup = await fetchJson<IpInfoLookupResponse>(
    `https://api.ipinfo.io/lookup/${encodedIp}?token=${encodedToken}`
  );

  if (lookup && !lookup.error) {
    const matchedFlags = [
      lookup.is_anonymous ? "anonymous" : null,
      lookup.is_hosting ? "hosting" : null
    ].filter(Boolean);

    return {
      checked: true,
      provider: "ipinfo",
      suspicious: matchedFlags.length > 0,
      reason: matchedFlags.join(",") || null,
      data: lookup as Record<string, unknown>
    };
  }

  return {
    checked: false,
    provider: "ipinfo",
    suspicious: false,
    reason: "ipinfo_lookup_failed",
    data: {}
  };
}
