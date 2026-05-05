import 'fake-indexeddb/auto';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Jasmine compatibility shim — tests use jasmine.createSpyObj / spyOn / jasmine.objectContaining
function makeSpyFn(impl?: (...args: any[]) => any): jest.Mock & { and: SpyAnd } {
  const fn = jest.fn(impl);
  attachAnd(fn);
  return fn as any;
}

interface SpyAnd {
  returnValue(val: any): any;
  callFake(impl: (...args: any[]) => any): any;
  stub(): any;
}

function attachAnd(fn: jest.Mock): void {
  (fn as any).and = {
    returnValue(val: any) { fn.mockReturnValue(val); return fn; },
    callFake(impl: (...args: any[]) => any) { fn.mockImplementation(impl); return fn; },
    stub() { fn.mockImplementation(() => undefined); return fn; },
  } satisfies SpyAnd;
}

const jasmineShim = {
  createSpyObj<T>(name: string, methods: (keyof T & string)[]): any {
    const obj: Record<string, any> = {};
    for (const method of methods) {
      obj[method] = makeSpyFn();
    }
    return obj;
  },
  objectContaining(expected: Record<string, any>) {
    return expect.objectContaining(expected);
  },
  anything() {
    return expect.anything();
  },
};

(globalThis as any).jasmine = jasmineShim;

(globalThis as any).spyOn = function spyOn(obj: any, method: string): any {
  const spy = jest.spyOn(obj, method);
  attachAnd(spy as unknown as jest.Mock);
  return spy;
};
