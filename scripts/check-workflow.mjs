#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const flow = JSON.parse(await readFile(new URL("../workflows/production/flows/agentic-screencast-video.json", import.meta.url), "utf8"));
const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
assert.equal(nodes.size, flow.nodes.length, "duplicate node identity");
const reach = new Set();
function visit(id) {
  assert.ok(nodes.has(id), "missing target " + id);
  if (reach.has(id)) return;
  reach.add(id);
  for (const target of Object.values(nodes.get(id).connections ?? {})) visit(target);
}
visit("start");
for (const node of flow.nodes) {
  if (node.type === "teleport") visit(node.id);
  if (node.type === "agent-directive") {
    assert.ok(node.directive && node.completionCondition && node.inputSchema);
    for (const key of node.inputSchema.globalInputs ?? []) {
      assert.ok(flow.variableRegistry[key], "undeclared global " + key);
    }
  }
}
assert.equal(reach.size, nodes.size, "unreachable nodes");
assert.equal(flow.variableRegistry.allow_paid_synthesis.default, false);
assert.equal(flow.variableRegistry.allow_commit.default, false);
assert.equal(flow.variableRegistry.allow_external_delivery.default, false);
assert.equal(flow.variableRegistry.review_mode.default, "self");
for (const id of ["facts-review", "story-review", "final-review"]) {
  assert.doesNotMatch(nodes.get(id).progressActiveLabel, /независим/iu, "default self-review must not be labelled independent");
}
assert.equal(flow.variableRegistry.synthesis_cost.default, "paid_or_unknown");

function route(overrides = {}, responses = {}) {
  const state = Object.fromEntries(Object.entries(flow.variableRegistry).map(([k, v]) => [k, v.default]));
  Object.assign(state, { voice_mode: "silent", capture_access_authorized: false }, overrides);
  const defaults = {
    environment: { environment_outcome: "ready" },
    "facts-review": { review_outcome: "pass" },
    "story-review": { review_outcome: "pass" },
    "material-produce": { material_route: "pass" },
    "material-produce-public": { material_route: "pass" },
    "stub-build": { stub_route: "pass" },
    synthesize: { synthesis_outcome: "ready" },
    "voice-review": { review_outcome: "pass" },
    "final-review": { review_outcome: "pass" },
  };
  let id = "start";
  const visited = [];
  for (let i = 0; i < 200; i++) {
    const node = nodes.get(id);
    assert.ok(node, "missing route " + id);
    visited.push(id);
    if (node.type === "end") return visited;
    if (node.type === "condition") {
      assert.equal(node.condition.operator, "eq");
      const left = node.condition.left.contextPath.split(".").reduce((v, k) => v?.[k], state);
      id = node.connections[String(left === node.condition.right)];
    } else {
      state[id] = responses[id] ?? defaults[id] ?? {};
      id = node.connections.success ?? node.connections.default;
    }
  }
  throw new Error("non-terminating test route");
}

const silent = route();
assert.ok(silent.includes("stub-build") && silent.includes("silent-accept") && silent.includes("final-review"));
assert.ok(!silent.includes("synthesize") && !silent.includes("human-record") && !silent.includes("deliver") && !silent.includes("optional-commit"));
const denied = route({ voice_mode: "synth" });
assert.ok(denied.includes("report-voice-blocked") && !denied.includes("synthesize") && !denied.includes("final-build"));
assert.ok(route({ voice_mode: "synth", synthesis_cost: "local" }).includes("synthesize"));
assert.ok(route({ voice_mode: "synth", allow_paid_synthesis: true }).includes("synthesize"));
assert.ok(route({ voice_mode: "human" }).includes("human-record"));
const blocked = route({}, { "material-produce-public": { material_route: "blocked" } });
assert.ok(blocked.includes("report-material-blocked") && !blocked.includes("stub-build"));
assert.ok(route({ allow_commit: true, allow_external_delivery: true }).includes("deliver"));
assert.equal(nodes.get("route-voice-repair-paid").connections.true, "synth-prepare");
assert.equal(nodes.get("route-final-build-repair").connections.true, "build-repair");
assert.equal(nodes.get("route-story-repair-changed").connections.true, "story-review");
assert.equal(nodes.get("route-material-repair-changed").connections.true, "route-capture-access");
console.log("Workflow graph, declared globals, safe defaults and 8 permission/voice/blocker routes passed.");
