import { calculatePay, roundMoney, startOfWeek } from './payroll-calculator';

// The same cases as PayrollCalculatorTests.cs, so the demo and the API agree.
describe('calculatePay', () => {
  it('pays regular hours only when a week is at or under 40 hours', () => {
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((date) => ({ date, hours: 8 }));
    const s = calculatePay(20, days, '2026-11-02', '2026-11-08');
    expect(s.regularHours).toBe(40);
    expect(s.overtimeHours).toBe(0);
    expect(s.grossPay).toBe(800);
    expect(s.taxDeduction).toBe(160);
    expect(s.netPay).toBe(640);
  });

  it('pays hours above 40 in a week at 1.5x', () => {
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map((date) => ({ date, hours: 9 }));
    const s = calculatePay(20, days, '2026-11-02', '2026-11-08');
    expect(s.regularHours).toBe(40);
    expect(s.overtimeHours).toBe(5);
    expect(s.overtimePay).toBe(150);
    expect(s.grossPay).toBe(950);
  });

  it('counts overtime per week, not across the whole period', () => {
    // 30 hours in each of two weeks = 60 hours in the period, but no week goes over 40.
    const days = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']
      .map((date) => ({ date, hours: 10 }));
    const s = calculatePay(10, days, '2026-11-01', '2026-11-30');
    expect(s.overtimeHours).toBe(0);
    expect(s.regularHours).toBe(60);
  });

  it('ignores days outside the period', () => {
    const s = calculatePay(10, [{ date: '2026-10-31', hours: 8 }, { date: '2026-11-02', hours: 8 }], '2026-11-01', '2026-11-30');
    expect(s.regularHours).toBe(8);
  });

  it('rejects bad input like the API does', () => {
    expect(() => calculatePay(0, [], '2026-11-01', '2026-11-02')).toThrow('greater than zero');
    expect(() => calculatePay(10, [], '2026-11-05', '2026-11-01')).toThrow('on or after');
    expect(() => calculatePay(10, [{ date: '2026-11-02', hours: 25 }], '2026-11-01', '2026-11-30')).toThrow('between 0 and 24');
  });
});

describe('helpers', () => {
  it('finds the Monday of a week, including for a Sunday', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02'); // Monday
  });

  it('rounds money half away from zero', () => {
    expect(roundMoney(2.345)).toBe(2.35);
    expect(roundMoney(-2.345)).toBe(-2.35);
  });
});
