import { PayStub } from './models';

/** Same rules as PayrollCalculator.cs: weekly overtime (Monday to Sunday) above the threshold, flat tax, rounded to cents. */
export interface PayrollOptions {
  weeklyOvertimeThreshold: number;
  overtimeMultiplier: number;
  taxRate: number;
}

export const DEFAULT_OPTIONS: PayrollOptions = { weeklyOvertimeThreshold: 40, overtimeMultiplier: 1.5, taxRate: 0.2 };

export interface WorkedDay {
  date: string; // yyyy-mm-dd
  hours: number;
}

/** Rounds half away from zero to 2 decimals, like Math.Round(value, 2, MidpointRounding.AwayFromZero) in C#. */
export function roundMoney(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) * 100 + 1e-9) / 100;
}

/** Monday of the week the date falls in, as yyyy-mm-dd (dates are handled in UTC to avoid time-zone shifts). */
export function startOfWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function calculatePay(
  hourlyRate: number,
  days: WorkedDay[],
  periodStart: string,
  periodEnd: string,
  options: PayrollOptions = DEFAULT_OPTIONS,
): PayStub {
  if (hourlyRate <= 0) throw new Error('Hourly rate must be greater than zero.');
  if (periodEnd < periodStart) throw new Error('Period end must be on or after period start.');

  const inPeriod = days.filter((d) => d.date >= periodStart && d.date <= periodEnd);
  for (const d of inPeriod) {
    if (d.hours < 0 || d.hours > 24) throw new Error(`Hours on ${d.date} must be between 0 and 24.`);
  }

  const weeks = new Map<string, number>();
  for (const d of inPeriod) weeks.set(startOfWeek(d.date), (weeks.get(startOfWeek(d.date)) ?? 0) + d.hours);

  let regularHours = 0;
  let overtimeHours = 0;
  for (const hours of weeks.values()) {
    const regular = Math.min(hours, options.weeklyOvertimeThreshold);
    regularHours += regular;
    overtimeHours += hours - regular;
  }

  const regularPay = roundMoney(regularHours * hourlyRate);
  const overtimePay = roundMoney(overtimeHours * hourlyRate * options.overtimeMultiplier);
  const grossPay = roundMoney(regularPay + overtimePay);
  const taxDeduction = roundMoney(grossPay * options.taxRate);
  return {
    periodStart, periodEnd, regularHours, overtimeHours,
    regularPay, overtimePay, grossPay, taxDeduction, netPay: roundMoney(grossPay - taxDeduction),
  };
}
