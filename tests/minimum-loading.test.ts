import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { MinimumLoading } from "../src/renderer/use-minimum-loading";

function fixture(context: TestContext) {
  let now = 0;
  context.mock.method(performance, "now", () => now);
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const changes: boolean[] = [];
  const loading = new MinimumLoading((visible) => changes.push(visible));
  const advance = (ms: number) => {
    now += ms;
    context.mock.timers.tick(ms);
  };
  return { loading, changes, advance };
}

test("fast completion holds the status until exactly two seconds", (context) => {
  const { loading, changes, advance } = fixture(context);
  loading.update(true);
  advance(100);
  loading.update(false);
  advance(1899);
  assert.deepEqual(changes, [true]);
  advance(1);
  assert.deepEqual(changes, [true, false]);
});

test("slow requests stay visible until completion without an extra delay", (context) => {
  const { loading, changes, advance } = fixture(context);
  loading.update(true);
  advance(5000);
  assert.deepEqual(changes, [true]);
  loading.update(false);
  assert.deepEqual(changes, [true, false]);
  loading.update(true);
  loading.update(false);
  advance(1999);
  assert.deepEqual(changes, [true, false, true]);
  advance(1);
  assert.deepEqual(changes, [true, false, true, false]);
});

test("a new request cancels pending dismissal and keeps one continuous session", (context) => {
  const { loading, changes, advance } = fixture(context);
  loading.update(true);
  advance(100);
  loading.update(false);
  advance(1000);
  loading.update(true);
  advance(2000);
  assert.deepEqual(changes, [true]);
  loading.update(false);
  assert.deepEqual(changes, [true, false]);
});

test("cleanup cancels pending callbacks and allows effect replay", (context) => {
  const { loading, changes, advance } = fixture(context);
  loading.update(true);
  loading.update(false);
  loading.dispose();
  advance(2000);
  assert.deepEqual(changes, [true]);
  loading.update(true);
  loading.update(false);
  assert.deepEqual(changes, [true, false]);
});
