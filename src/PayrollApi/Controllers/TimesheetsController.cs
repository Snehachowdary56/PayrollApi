using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayrollApi.Data;
using PayrollApi.Dtos;
using PayrollApi.Models;

namespace PayrollApi.Controllers;

[ApiController]
[Route("api/employees/{employeeId:int}/timesheets")]
public class TimesheetsController(PayrollDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimesheetResponse>>> Get(
        int employeeId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        if (!await db.Employees.AnyAsync(e => e.Id == employeeId)) return NotFound();

        var query = db.Timesheets.AsNoTracking().Where(t => t.EmployeeId == employeeId);
        if (from is not null) query = query.Where(t => t.WorkDate >= from);
        if (to is not null) query = query.Where(t => t.WorkDate <= to);

        var entries = await query.OrderBy(t => t.WorkDate).ToListAsync();
        return Ok(entries.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<TimesheetResponse>> Create(int employeeId, CreateTimesheetRequest request)
    {
        if (!await db.Employees.AnyAsync(e => e.Id == employeeId)) return NotFound();

        if (await db.Timesheets.AnyAsync(t => t.EmployeeId == employeeId && t.WorkDate == request.WorkDate))
            return Conflict(new { message = $"A timesheet entry for {request.WorkDate} already exists." });

        var entry = new TimesheetEntry
        {
            EmployeeId = employeeId,
            WorkDate = request.WorkDate,
            HoursWorked = request.HoursWorked
        };

        db.Timesheets.Add(entry);
        await db.SaveChangesAsync();
        return Created($"/api/employees/{employeeId}/timesheets/{entry.Id}", ToResponse(entry));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int employeeId, int id)
    {
        var entry = await db.Timesheets.FirstOrDefaultAsync(t => t.Id == id && t.EmployeeId == employeeId);
        if (entry is null) return NotFound();

        db.Timesheets.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static TimesheetResponse ToResponse(TimesheetEntry t) =>
        new(t.Id, t.EmployeeId, t.WorkDate, t.HoursWorked);
}
