import { describe, expect, it } from 'vitest';
import { ExpressionError, evaluateExpression as ev, formatResult } from '@/lib/expression';

describe('evaluateExpression', () => {
  it('handles basic arithmetic and precedence', () => {
    expect(ev('2+3×4')).toBe(14);
    expect(ev('(2+3)*4')).toBe(20);
    expect(ev('10÷4')).toBe(2.5);
    expect(ev('7-2-1')).toBe(4);
  });

  it('treats ^ as right associative and binding tighter than unary minus', () => {
    expect(ev('2^3^2')).toBe(512);
    expect(ev('-2^2')).toBe(-4);
    expect(ev('2^-1')).toBe(0.5);
  });

  it('supports the calculator button outputs', () => {
    expect(ev('50/100')).toBe(0.5); // % button
    expect(ev('5*-1')).toBe(-5); // +/- button
    expect(ev('200%')).toBe(2);
  });

  it('evaluates trig in degrees or radians', () => {
    expect(formatResult(ev('sin(30)', { degrees: true }))).toBe('0.5');
    expect(formatResult(ev('cos(60)', { degrees: true }))).toBe('0.5');
    expect(formatResult(ev('sin(π/2)', { degrees: false }))).toBe('1');
    expect(formatResult(ev('tan(45)'))).toBe('1');
  });

  it('supports nested functions (regression: the old regex implementation broke these)', () => {
    expect(ev('sqrt(sqrt(16))')).toBe(2);
    expect(formatResult(ev('sin(cos(90)+30)'))).toBe('0.5');
    expect(ev('log(ln(e)+99)')).toBe(2);
  });

  it('supports constants and implicit multiplication', () => {
    expect(ev('2π')).toBeCloseTo(2 * Math.PI);
    expect(ev('3(4+1)')).toBe(15);
    expect(ev('e')).toBe(Math.E);
  });

  it('rejects malformed or hostile input without executing it', () => {
    const bad = ['', '2+', '(1', '1)', 'foo(1)', 'sin', 'alert(1)', '2 $ 3', '1..2', 'Math.constructor', 'process.exit()'];
    for (const input of bad) {
      expect(() => ev(input), input).toThrow(ExpressionError);
    }
  });

  it('returns non-finite values that formatResult reports as Error', () => {
    expect(formatResult(ev('1/0'))).toBe('Error');
    expect(formatResult(ev('sqrt(-1)'))).toBe('Error');
    expect(formatResult(ev('ln(0)'))).toBe('Error');
  });

  it('formats floating point noise away', () => {
    expect(formatResult(ev('0.1+0.2'))).toBe('0.3');
  });
});
