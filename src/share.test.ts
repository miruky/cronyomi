import { describe, expect, it } from 'vitest';
import { readSharedExpression, sharedExpressionQuery } from './share';

describe('readSharedExpression', () => {
  it('クエリから式を読み取る(+は空白)', () => {
    expect(readSharedExpression('?e=30+8+*+*+1-5')).toBe('30 8 * * 1-5');
  });

  it('別名マクロもそのまま読める', () => {
    expect(readSharedExpression('?e=%40daily')).toBe('@daily');
  });

  it('式が無ければnull', () => {
    expect(readSharedExpression('')).toBeNull();
    expect(readSharedExpression('?e=')).toBeNull();
    expect(readSharedExpression('?e=%20%20')).toBeNull();
    expect(readSharedExpression('?other=1')).toBeNull();
  });
});

describe('sharedExpressionQuery', () => {
  it('式を経由してラウンドトリップする', () => {
    for (const expr of ['*/5 9-17 * * 1-5', '0 0 1 1 *', '@weekly']) {
      expect(readSharedExpression(sharedExpressionQuery(expr))).toBe(expr);
    }
  });
});
