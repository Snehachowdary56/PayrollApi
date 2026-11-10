using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayrollApi.Data;
using PayrollApi.Services;

namespace PayrollApi.Controllers;

[ApiController]
[Route("api/employees/{employeeId:int}/payroll")]
public class PayrollController(PayrollDbContext db, PayrollCalculator calculator) : ControllerBase
{
    /// <summary>Calculates pay for an employee over a pay period, e.g. ?from=2026-11-02&amp;to=2026-11-15</summary>
    [HttpGet]
    public async Task<ActionResult<PayStub>> Calculate(int employeeId, [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        if (to < from)
            return BadRequest(new { message = "'to' must be on or after 'from'." });

        var employee = await db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == employeeId);
        if (employee is null) return NotFound();

        var days = await db.Timesheets.AsNoTracking()
            .Where(t => t.EmployeeId == employeeId && t.WorkDate >= from && t.WorkDate <= to)
            .Select(t => new WorkedDay(t.WorkDate, t.HoursWorked))
            .ToListAsync();

        return Ok(calculator.Calculate(employee.HourlyRate, days, from, to));
    }
}
