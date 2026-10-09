import { setTimeout as sleep } from "node:timers/promises";
import { envValue } from "./env.js";
import { msg } from "../msg.js";

export interface SpeechKitPolicy { intervalMs: number; maxAttempts: number }

function integer(name: string, fallback: number, min: number, max: number): number {
  const raw = envValue(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!/^\d+$/u.test(raw) || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

/** Transport settings stay outside voice data and paid audio cache keys. */
export function speechkitPolicy(): SpeechKitPolicy {
  return {
    intervalMs: integer("SPEECHKIT_REQUEST_INTERVAL_MS", 0, 0, 60000),
    maxAttempts: integer("SPEECHKIT_MAX_ATTEMPTS", 3, 1, 5),
  };
}

interface Transport {
  request: typeof fetch;
  wait: (ms: number) => Promise<unknown>;
  now: () => number;
}
const transient = new Set([429, 500, 502, 503, 504]);

/** One request, including its response body, finishes before the next starts. */
export function createSpeechKitRequest(deps: Transport = {
  request: (...args) => fetch(...args), wait: sleep, now: Date.now,
}): (url: string, init: RequestInit, policy: SpeechKitPolicy) => Promise<ArrayBuffer> {
  let tail: Promise<unknown> = Promise.resolve();
  let finished: number | undefined;
  return (url, init, policy) => {
    const run = tail.then(async () => {
      let retryDelay = 0;
      for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        if (finished !== undefined) {
          const remaining = Math.max(policy.intervalMs, retryDelay) - (deps.now() - finished);
          if (remaining > 0) await deps.wait(remaining);
        }
        let retryable = false;
        try {
          const response = await deps.request(url, init);
          if (response.ok) return await response.arrayBuffer();
          retryable = transient.has(response.status);
          const detail = (await response.text()).slice(0, 300);
          const requestId = response.headers.get("x-request-id");
          const error = new Error(msg("speechkit.refused", { status: response.status,
            detail: `${detail}${requestId ? `; request-id ${requestId.slice(0, 128)}` : ""}` }));
          if (!retryable || attempt === policy.maxAttempts) throw error;
          const header = response.headers.get("retry-after");
          const seconds = header === null ? NaN : Number(header);
          const until = header === null ? NaN : Date.parse(header);
          const requested = Number.isFinite(seconds) ? seconds * 1000 : until - deps.now();
          retryDelay = Math.min(60000, Math.max(1500 * 2 ** (attempt - 1), Number.isFinite(requested) ? requested : 0));
        } catch (error) {
          // HTTP errors already carry their retry decision. Fetch transport or
          // body-read failures are TypeErrors; caller cancellation is not retried.
          if (!(error instanceof TypeError) || attempt === policy.maxAttempts) throw error;
          retryDelay = 1500 * 2 ** (attempt - 1);
        } finally {
          finished = deps.now();
        }
      }
      throw new Error("SpeechKit attempts exhausted.");
    });
    tail = run.catch(() => undefined);
    return run;
  };
}
