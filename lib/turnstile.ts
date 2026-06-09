type TurnstileSiteverifyResponse = {
  success: boolean;
  action?: string;
  "error-codes"?: string[];
};

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string | null,
  expectedAction: "login" | "register"
) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey || !token) {
    return false;
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token
  });

  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(siteverifyUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body,
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as TurnstileSiteverifyResponse;

    if (!result.success) {
      return false;
    }

    if (result.action && result.action !== expectedAction) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
