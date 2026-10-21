import { describe, expect, it } from 'vitest';
import { INITIAL_TIMER_STATE, MODE_DURATIONS, formatTime, tickTimer } from '@/lib/timer';

describe('tickTimer', () => {
  it('counts down one second', () => {
    expect(tickTimer(INITIAL_TIMER_STATE).timeLeft).toBe(MODE_DURATIONS.focus - 1);
  });

  it('moves focus -> short break, counting one completed session and one rollover', () => {
    const next = tickTimer({ ...INITIAL_TIMER_STATE, timeLeft: 1 });
    expect(next).toMatchObject({
      mode: 'shortBreak',
      timeLeft: MODE_DURATIONS.shortBreak,
      completedSessions: 1,
      rollovers: 1,
    });
  });

  it('moves break -> focus without counting a session', () => {
    const next = tickTimer({ mode: 'shortBreak', timeLeft: 1, completedSessions: 1, rollovers: 1 });
    expect(next).toMatchObject({
      mode: 'focus',
      timeLeft: MODE_DURATIONS.focus,
      completedSessions: 1,
      rollovers: 2,
    });
  });

  it('is pure: the same input gives the same output (StrictMode safe)', () => {
    const s = { ...INITIAL_TIMER_STATE, timeLeft: 1 };
    expect(tickTimer(s)).toEqual(tickTimer(s));
    expect(s.completedSessions).toBe(0);
  });
});

describe('formatTime', () => {
  it('pads minutes and seconds and clamps negatives', () => {
    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(-5)).toBe('00:00');
  });
});
