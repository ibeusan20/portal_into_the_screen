export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ema = (prev, next, hold) => prev * hold + next * (1 - hold);
