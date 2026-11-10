using PayrollApi.Services;

namespace PayrollApi.Tests;

public class PayrollCalculatorTests
{
    private readonly PayrollCalculator _calculator = new(new PayrollOptions
    {
        WeeklyOvertimeThreshold = 40m,
        OvertimeMultiplier = 1.5m,
        TaxRate = 0.20m
    });

    // Monday, Nov 2 2026 to Sunday, Nov 8 2026 is one full week.
    private static readonly DateOnly WeekStart = new(2026, 11, 2);
    private static readonly DateOnly WeekEnd = new(2026, 11, 8);

    private static List<WorkedDay> Days(DateOnly start, params decimal[] hours) =>
        hours.Select((h, i) => new WorkedDay(start.AddDays(i), h)).ToList();

    [Fact]
    public void Exactly40Hours_HasNoOvertime()
    {
        var stub = _calculator.Calculate(20m, Days(WeekStart, 8, 8, 8, 8, 8), WeekStart, WeekEnd);

        Assert.Equal(40m, stub.RegularHours);
        Assert.Equal(0m, stub.OvertimeHours);
        Assert.Equal(800m, stub.GrossPay);
    }

    [Fact]
    public void HoursAbove40_ArePaidAtOvertimeRate()
    {
        // 45 hours: 40 regular at $20 = $800, 5 overtime at $30 = $150.
        var stub = _calculator.Calculate(20m, Days(WeekStart, 9, 9, 9, 9, 9), WeekStart, WeekEnd);

        Assert.Equal(40m, stub.RegularHours);
        Assert.Equal(5m, stub.OvertimeHours);
        Assert.Equal(800m, stub.RegularPay);
        Assert.Equal(150m, stub.OvertimePay);
        Assert.Equal(950m, stub.GrossPay);
    }

    [Fact]
    public void TaxIsDeductedFromGross()
    {
        var stub = _calculator.Calculate(25m, Days(WeekStart, 8, 8, 8, 8, 8), WeekStart, WeekEnd);

        Assert.Equal(1000m, stub.GrossPay);
        Assert.Equal(200m, stub.TaxDeduction);
        Assert.Equal(800m, stub.NetPay);
    }

    [Fact]
    public void OvertimeIsCalculatedPerWeek_NotAcrossThePeriod()
    {
        // Two weeks of 35 hours = 70 hours total, but neither week exceeds 40, so no overtime.
        var days = Days(WeekStart, 7, 7, 7, 7, 7)
            .Concat(Days(WeekStart.AddDays(7), 7, 7, 7, 7, 7))
            .ToList();

        var stub = _calculator.Calculate(20m, days, WeekStart, WeekEnd.AddDays(7));

        Assert.Equal(70m, stub.RegularHours);
        Assert.Equal(0m, stub.OvertimeHours);
    }

    [Fact]
    public void NoHoursWorked_ReturnsZeroPay()
    {
        var stub = _calculator.Calculate(20m, [], WeekStart, WeekEnd);

        Assert.Equal(0m, stub.GrossPay);
        Assert.Equal(0m, stub.NetPay);
    }

    [Fact]
    public void DaysOutsideThePeriod_AreIgnored()
    {
        var days = Days(WeekStart, 8, 8);
        days.Add(new WorkedDay(WeekStart.AddDays(-1), 10)); // the Sunday before

        var stub = _calculator.Calculate(20m, days, WeekStart, WeekEnd);

        Assert.Equal(16m, stub.RegularHours);
    }

    [Fact]
    public void PayIsRoundedToCents()
    {
        // 7.5 hours at $17.33 = $129.975, which rounds to $129.98.
        var stub = _calculator.Calculate(17.33m, Days(WeekStart, 7.5m), WeekStart, WeekEnd);

        Assert.Equal(129.98m, stub.GrossPay);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void InvalidHourlyRate_Throws(double rate)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            _calculator.Calculate((decimal)rate, Days(WeekStart, 8), WeekStart, WeekEnd));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(25)]
    public void InvalidDailyHours_Throws(double hours)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            _calculator.Calculate(20m, Days(WeekStart, (decimal)hours), WeekStart, WeekEnd));
    }

    [Fact]
    public void PeriodEndBeforeStart_Throws()
    {
        Assert.Throws<ArgumentException>(() =>
            _calculator.Calculate(20m, [], WeekEnd, WeekStart));
    }
}
