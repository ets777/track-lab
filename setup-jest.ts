import 'fake-indexeddb/auto';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { jest as jestObj } from '@jest/globals';

setupZoneTestEnv();

// Jasmine compatibility shim — tests use jasmine.createSpyObj / spyOn / jasmine.objectContaining
function makeSpyFn(impl?: (...args: any[]) => any): any {
  const fn = jestObj.fn(impl) as any;
  attachAnd(fn);
  return fn;
}


function attachAnd(fn: any): void {
  fn.and = {
    returnValue(val: any) { fn.mockReturnValue(val); return fn; },
    returnValues(...vals: any[]) { for (const v of vals) fn.mockReturnValueOnce(v); return fn; },
    resolveTo(val: any) { fn.mockResolvedValue(val); return fn; },
    rejectWith(err: any) { fn.mockRejectedValue(err); return fn; },
    callFake(impl: (...args: any[]) => any) { fn.mockImplementation(impl); return fn; },
    stub() { fn.mockImplementation(() => undefined); return fn; },
  };
  fn.calls = {
    mostRecent() { const c = fn.mock.calls; return c.length ? { args: c[c.length - 1] } : undefined; },
    allArgs() { return fn.mock.calls; },
    count() { return fn.mock.calls.length; },
    any() { return fn.mock.calls.length > 0; },
    reset() { fn.mockClear(); },
  };
}

const jasmineShim = {
  createSpy(_name?: string): any {
    return makeSpyFn();
  },
  createSpyObj<T>(name: string, methods: (keyof T & string)[]): any {
    const obj: Record<string, any> = {};
    for (const method of methods) {
      obj[method] = makeSpyFn();
    }
    return obj;
  },
  objectContaining(expected: Record<string, any>) {
    return (globalThis as any).expect.objectContaining(expected);
  },
  arrayContaining(expected: any[]) {
    return (globalThis as any).expect.arrayContaining(expected);
  },
  anything() {
    return (globalThis as any).expect.anything();
  },
};

(globalThis as any).jasmine = jasmineShim;

// Add Jasmine-only matchers that Jest doesn't include
(globalThis as any).expect.extend({
  toBeTrue(received: unknown) {
    return { pass: received === true, message: () => `Expected ${received} to be true` };
  },
  toBeFalse(received: unknown) {
    return { pass: received === false, message: () => `Expected ${received} to be false` };
  },
  toHaveBeenCalledOnceWith(received: any, ...expected: any[]) {
    const calls = received?.mock?.calls ?? [];
    const pass = calls.length === 1 && JSON.stringify(calls[0]) === JSON.stringify(expected);
    return { pass, message: () => `Expected spy to have been called once with ${JSON.stringify(expected)}, got ${JSON.stringify(calls)}` };
  },
});

// Polyfill structuredClone for jsdom environments that lack it
if (typeof (globalThis as any).structuredClone === 'undefined') {
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

(globalThis as any).spyOn = function spyOn(obj: any, method: string): any {
  const spy = jestObj.spyOn(obj, method) as any;
  attachAnd(spy);
  return spy;
};
