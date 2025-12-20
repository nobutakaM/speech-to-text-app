import { describe, it, expect } from 'vitest';
import { floatTo16BitPCM } from '../src/utils.js';

describe('floatTo16BitPCM', () => {
  it('clamps and converts range correctly', () => {
    const f = new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]);
    const i16 = floatTo16BitPCM(f);
    expect(i16[0]).toBe(-32768);
    expect(i16[1]).toBe(-32768);
    expect(i16[3]).toBe(0);
    expect(i16[5]).toBe(32767);
    expect(i16[6]).toBe(32767);
  });
});
