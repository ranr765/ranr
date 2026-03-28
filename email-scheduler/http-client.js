import https from "https";

/**
 * Make an HTTPS request using only Node.js built-ins.
 * Returns { statusCode, headers, body (parsed JSON or string) }.
 */
export function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}
