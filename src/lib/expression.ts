/**
 * Safe arithmetic expression evaluator for the scientific calculator.
 * A small recursive-descent parser: no eval / Function, so arbitrary input cannot execute code.
 *
 * Grammar (highest precedence last):
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '×' | '/' | '÷') unary | implicitMul)*
 *   unary   := ('+' | '-') unary | power
 *   power   := postfix ('^' unary)?          (right associative; -2^2 = -4)
 *   postfix := primary '%'*
 *   primary := number | constant | func '(' expr ')' | '(' expr ')'
 */

export class ExpressionError extends Error {}

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: string }
  | { type: 'name'; value: string };

const FUNCTIONS = ['sin', 'cos', 'tan', 'sqrt', 'log', 'ln'] as const;
type FunctionName = (typeof FUNCTIONS)[number];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const text = input.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) throw new ExpressionError(`Bad number "${text}"`);
      tokens.push({ type: 'num', value: Number(text) });
      i = j;
    } else if (/[a-z]/i.test(ch)) {
      let j = i;
      while (j < input.length && /[a-z]/i.test(input[j])) j++;
      tokens.push({ type: 'name', value: input.slice(i, j).toLowerCase() });
      i = j;
    } else if (ch === 'π') {
      tokens.push({ type: 'name', value: 'pi' });
      i++;
    } else if ('+-*/^()%×÷'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else {
      throw new ExpressionError(`Unexpected character "${ch}"`);
    }
  }
  return tokens;
}

export function evaluateExpression(input: string, opts: { degrees?: boolean } = {}): number {
  const degrees = opts.degrees ?? true;
  const tokens = tokenize(input);
  let pos = 0;

  const peek = () => tokens[pos];
  const isOp = (t: Token | undefined, ...values: string[]) => t?.type === 'op' && values.includes(t.value);

  function parseExpr(): number {
    let left = parseTerm();
    while (isOp(peek(), '+', '-')) {
      const op = (tokens[pos++] as { value: string }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function startsOperand(t: Token | undefined): boolean {
    return t !== undefined && (t.type === 'num' || t.type === 'name' || isOp(t, '('));
  }

  function parseTerm(): number {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (isOp(t, '*', '×', '/', '÷')) {
        pos++;
        const right = parseUnary();
        left = isOp(t, '*', '×') ? left * right : left / right;
      } else if (startsOperand(t)) {
        // Implicit multiplication, e.g. "2π" or "3(4+1)".
        left *= parseUnary();
      } else {
        return left;
      }
    }
  }

  function parseUnary(): number {
    const t = peek();
    if (isOp(t, '+')) {
      pos++;
      return parseUnary();
    }
    if (isOp(t, '-')) {
      pos++;
      return -parseUnary();
    }
    return parsePower();
  }

  function parsePower(): number {
    const base = parsePostfix();
    if (isOp(peek(), '^')) {
      pos++;
      return Math.pow(base, parseUnary());
    }
    return base;
  }

  function parsePostfix(): number {
    let value = parsePrimary();
    while (isOp(peek(), '%')) {
      pos++;
      value /= 100;
    }
    return value;
  }

  function applyFunction(name: FunctionName, x: number): number {
    const angle = degrees ? (x * Math.PI) / 180 : x;
    switch (name) {
      case 'sin':
        return Math.sin(angle);
      case 'cos':
        return Math.cos(angle);
      case 'tan':
        return Math.tan(angle);
      case 'sqrt':
        return Math.sqrt(x);
      case 'log':
        return Math.log10(x);
      case 'ln':
        return Math.log(x);
    }
  }

  function parsePrimary(): number {
    const t = tokens[pos++];
    if (!t) throw new ExpressionError('Unexpected end of expression');
    if (t.type === 'num') return t.value;
    if (t.type === 'name') {
      if (t.value === 'pi') return Math.PI;
      if (t.value === 'e') return Math.E;
      if ((FUNCTIONS as readonly string[]).includes(t.value)) {
        if (!isOp(peek(), '(')) throw new ExpressionError(`Function ${t.value} needs parentheses`);
        pos++;
        const arg = parseExpr();
        if (!isOp(peek(), ')')) throw new ExpressionError('Missing closing parenthesis');
        pos++;
        return applyFunction(t.value as FunctionName, arg);
      }
      throw new ExpressionError(`Unknown name "${t.value}"`);
    }
    if (t.value === '(') {
      const inner = parseExpr();
      if (!isOp(peek(), ')')) throw new ExpressionError('Missing closing parenthesis');
      pos++;
      return inner;
    }
    throw new ExpressionError(`Unexpected "${t.value}"`);
  }

  if (tokens.length === 0) throw new ExpressionError('Empty expression');
  const result = parseExpr();
  if (pos < tokens.length) throw new ExpressionError('Unexpected trailing input');
  return result;
}

/** Formats like the calculator display: up to 8 decimals, trailing zeros trimmed. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return parseFloat(value.toFixed(8)).toString();
}
