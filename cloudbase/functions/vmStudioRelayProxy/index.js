const DEFAULT_RELAY_BASE_URL = "http://zx2.52youxi.cc:3000";
const RELAY_BASE_URL = (process.env.RELAY_BASE_URL || DEFAULT_RELAY_BASE_URL).replace(/\/$/, "");
const FORWARDED_HEADERS = new Set(["authorization", "content-type", "x-relay-key"]);
const DEFAULT_RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Authorization,Content-Type,X-Relay-Key",
};

const buildTargetUrl = (event) => {
  const rawPath = (event.path || "/").replace(/^\/api\/gemini/, "") || "/";
  const query = new URLSearchParams(event.queryStringParameters || {});
  const queryString = query.toString();

  return `${RELAY_BASE_URL}${rawPath}${queryString ? `?${queryString}` : ""}`;
};

const buildForwardHeaders = (event) => {
  const headers = {};

  for (const [name, value] of Object.entries(event.headers || {})) {
    const lowerName = name.toLowerCase();

    if (FORWARDED_HEADERS.has(lowerName) && value) {
      headers[lowerName] = value;
    }
  }

  return headers;
};

const buildRequestBody = (event) => {
  if (!event.body) {
    return undefined;
  }

  return event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
};

exports.main = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: DEFAULT_RESPONSE_HEADERS,
      body: "",
    };
  }

  try {
    const targetUrl = buildTargetUrl(event);
    const forwardHeaders = buildForwardHeaders(event);

    const response = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: method === "GET" || method === "HEAD" ? undefined : buildRequestBody(event),
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...DEFAULT_RESPONSE_HEADERS,
        "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      },
      body: responseText,
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {
        ...DEFAULT_RESPONSE_HEADERS,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        error: "relay_proxy_failed",
        message: error instanceof Error ? error.message : "Unknown proxy error",
        relayBaseUrl: RELAY_BASE_URL,
      }),
    };
  }
};
