import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpeechKitRequest, speechkitPolicy } from "../../voice/speechkit-request.js";
import { voiceKey } from "../../voice/index.js";

const policy = { intervalMs: 1500, maxAttempts: 3 };
function harness(statuses: number[]) {
  let time = 0;
  const starts: number[] = [], waits: number[] = [];
  const send = createSpeechKitRequest({
    request: async () => { starts.push(time); time += 200; return new Response('audio', {status: statuses.shift() ?? 200}); },
    now: () => time,
    wait: async ms => { waits.push(ms); time += ms; },
  });
  return { send: () => send('https://example.test/tts', {}, policy), starts, waits };
}

test('pacing waits from completed response, serializes simultaneous calls', async () => {
  const h = harness([200, 200, 200]);
  await Promise.all([h.send(), h.send(), h.send()]);
  assert.deepEqual(h.starts, [0, 1700, 3400]);
  assert.deepEqual(h.waits, [1500, 1500]);
});

test('response body remains inside serialized request', async () => {
  let close: (() => void) | undefined;
  let enter: (() => void) | undefined;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  let calls = 0;
  const send = createSpeechKitRequest({
    request: async () => { calls++; if (calls > 1) return new Response('second');
      enter?.();
      return new Response(new ReadableStream({ start(controller) { close = () => { controller.enqueue(new TextEncoder().encode('first')); controller.close(); }; } })); },
    now: () => 0, wait: async () => {},
  });
  const a = send('https://example.test', {}, {intervalMs: 0, maxAttempts: 1});
  const b = send('https://example.test', {}, {intervalMs: 0, maxAttempts: 1});
  await entered;
  assert.equal(calls, 1);
  close?.();
  await Promise.all([a,b]);
  assert.equal(calls, 2);
});

test('transient 504 retries then succeeds, attempts are bounded', async () => {
  const recovered = harness([504, 200]);
  assert.equal(new TextDecoder().decode(await recovered.send()), 'audio');
  assert.equal(recovered.starts.length, 2);
  const failed = harness([504,504,504,200]);
  await assert.rejects(failed.send(), /504/);
  assert.equal(failed.starts.length, 3);
  // A failed request must not poison the admission queue.
  await failed.send();
  assert.equal(failed.starts.length, 4);
});

test('permanent auth and input failures are never retried', async () => {
  for (const status of [400,401,403,404]) {
    const h = harness([status, 200]);
    await assert.rejects(h.send(), new RegExp(String(status)));
    assert.equal(h.starts.length, 1);
  }
});

test('Retry-After delays admission, capped at sixty seconds', async () => {
  let time = 0, calls = 0;
  const waits: number[] = [];
  const send = createSpeechKitRequest({request: async () => ++calls === 1
    ? new Response('busy', {status: 429, headers: {'Retry-After': '120'}}) : new Response('audio'),
    now: () => time, wait: async ms => { waits.push(ms); time += ms; }});
  await send('https://example.test', {}, policy);
  assert.deepEqual(waits, [60000]);
});

test('transport settings validate without changing paid audio cache identity', () => {
  const names = ['SPEECHKIT_REQUEST_INTERVAL_MS', 'SPEECHKIT_MAX_ATTEMPTS'];
  const saved = names.map(name => process.env[name]);
  const voice = {engine: 'speechkit', name: 'kuznetsov', speed: 1.2};
  const before = voiceKey('same narration', voice, '');
  try {
    process.env.SPEECHKIT_REQUEST_INTERVAL_MS = '1500';
    process.env.SPEECHKIT_MAX_ATTEMPTS = '3';
    assert.deepEqual(speechkitPolicy(), policy);
    assert.equal(voiceKey('same narration', voice, ''), before);
    process.env.SPEECHKIT_REQUEST_INTERVAL_MS = 'NaN';
    assert.throws(speechkitPolicy, /SPEECHKIT_REQUEST_INTERVAL_MS/);
    process.env.SPEECHKIT_REQUEST_INTERVAL_MS = '0';
    process.env.SPEECHKIT_MAX_ATTEMPTS = '0';
    assert.throws(speechkitPolicy, /SPEECHKIT_MAX_ATTEMPTS/);
  } finally {
    names.forEach((name,i) => { const value=saved[i]; if(value===undefined) delete process.env[name]; else process.env[name]=value; });
  }
});


test('fetch failure retries within the bound and final HTTP failure preserves request id', async () => {
  let calls = 0, time = 0;
  const send = createSpeechKitRequest({ request: async () => {
    if (++calls === 1) throw new TypeError('fetch failed');
    return new Response('stream timeout', {status: 504, headers: {'x-request-id': 'trace-123'}});
  }, now: () => time, wait: async ms => {time += ms;} });
  await assert.rejects(send('https://example.test', {}, {intervalMs: 0, maxAttempts: 2}), /504.*request-id trace-123/);
  assert.equal(calls, 2);
});
