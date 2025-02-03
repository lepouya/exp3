export function getSystem(): typeof globalThis | undefined {
  try {
    if (global) {
      return global;
    }
  } catch {}

  try {
    if (window) {
      return window;
    }
  } catch {}

  try {
    if (self) {
      return self;
    }
  } catch {}

  try {
    if (globalThis) {
      return globalThis;
    }
  } catch {}

  return undefined;
}

const system = getSystem()!;
export default system;
