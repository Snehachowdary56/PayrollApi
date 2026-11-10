namespace PayrollApi.Services;

/// <summary>Settings for payroll rules, bound from the "Payroll" section of appsettings.json.</summary>
public class PayrollOptions
{
    public decimal WeeklyOvertimeThreshold { get; set; } = 40m;
    public decimal OvertimeMultiplier { get; set; } = 1.5m;
    public decimal TaxRate { get; set; } = 0.20m;
}

public record WorkedDay(DateOnly Date, decimal Hours);

public record PayStub(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal RegularHours,
    decimal OvertimeHours,
    decimal RegularPay,
    decimal OvertimePay,
    decimal GrossPay,
    decimal TaxDeduction,
    decimal NetPay);

/// <summary>
/// Pure payroll logic with no database or HTTP dependencies, so it is easy to unit test.
/// Overtime is calculated per calendar week (Monday to Sunday): hours above the weekly
/// threshold are paid at the overtime multiplier.
/// </summary>
public class PayrollCalculator(PayrollOptions options)
{
    public PayStub Calculate(decimal hourlyRate, IEnumerable<WorkedDay> days, DateOnly periodStart, DateOnly periodEnd)
    {
        if (hourlyRate <= 0)
            throw new ArgumentOutOfRangeException(nameof(hourlyRate), "Hourly rate must be greater than zero.");
        if (periodEnd < periodStart)
            throw new ArgumentException("Period end must be on or after period start.");

        var inPeriod = days.Where(d => d.Date >= periodStart && d.Date <= periodEnd).ToList();

        foreach (var d in inPeriod)
        {
            if (d.Hours < 0 || d.Hours > 24)
                throw new ArgumentOutOfRangeException(nameof(days), $"Hours on {d.Date} must be between 0 and 24.");
        }

        decimal regularHours = 0, overtimeHours = 0;

        foreach (var week in inPeriod.GroupBy(d => StartOfWeek(d.Date)))
        {
            var weekHours = week.Sum(d => d.Hours);
            var regular = Math.Min(weekHours, options.WeeklyOvertimeThreshold);
            regularHours += regular;
            overtimeHours += weekHours - regular;
        }

        var regularPay = Round(regularHours * hourlyRate);
        var overtimePay = Round(overtimeHours * hourlyRate * options.OvertimeMultiplier);
        var gross = regularPay + overtimePay;
        var tax = Round(gross * options.TaxRate);

        return new PayStub(periodStart, periodEnd, regularHours, overtimeHours,
                           regularPay, overtimePay, gross, tax, gross - tax);
    }

    private static DateOnly StartOfWeek(DateOnly date)
    {
        // DayOfWeek: Sunday = 0 ... Saturday = 6. Shift so Monday is the first day.
        int diff = ((int)date.DayOfWeek + 6) % 7;
        return date.AddDays(-diff);
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
