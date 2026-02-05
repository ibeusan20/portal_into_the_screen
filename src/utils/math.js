export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ema = (prev, next, hold) => prev * hold + next * (1 - hold);
export const lerp = (a, b, t) => a + (b - a) * t;
