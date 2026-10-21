export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  completedSessions: number;
  /** Increments every time a countdown reaches zero; used to trigger the chime exactly once. */
  rollovers: number;
}

export const INITIAL_TIMER_STATE: TimerState = {
  mode: 'focus',
  timeLeft: MODE_DURATIONS.focus,
  completedSessions: 0,
  rollovers: 0,
};

/** One-second tick. Pure so it is safe under React StrictMode's double-invoked updaters. */
export function tickTimer(state: TimerState): TimerState {
  if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };

  if (state.mode === 'focus') {
    return {
      mode: 'shortBreak',
      timeLeft: MODE_DURATIONS.shortBreak,
      completedSessions: state.completedSessions + 1,
      rollovers: state.rollovers + 1,
    };
  }
  return {
    ...state,
    mode: 'focus',
    timeLeft: MODE_DURATIONS.focus,
    rollovers: state.rollovers + 1,
  };
}

export function formatTime(secs: number): string {
  const safe = Math.max(0, Math.floor(secs));
  const mins = Math.floor(safe / 60);
  return `${mins.toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
