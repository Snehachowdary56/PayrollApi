using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayrollApi.Data;
using PayrollApi.Dtos;
using PayrollApi.Models;

namespace PayrollApi.Controllers;

[ApiController]
[Route("api/employees")]
public class EmployeesController(PayrollDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeResponse>>> GetAll([FromQuery] string? department)
    {
        var query = db.Employees.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(e => e.Department == department);

        var employees = await query.OrderBy(e => e.LastName).ToListAsync();
        return Ok(employees.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeResponse>> GetById(int id)
    {
        var employee = await db.Employees.FindAsync(id);
        return employee is null ? NotFound() : Ok(ToResponse(employee));
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeResponse>> Create(CreateEmployeeRequest request)
    {
        if (await db.Employees.AnyAsync(e => e.Email == request.Email))
            return Conflict(new { message = $"An employee with email {request.Email} already exists." });

        var employee = new Employee
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Department = request.Department ?? "General",
            HourlyRate = request.HourlyRate,
            HireDate = request.HireDate
        };

        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, ToResponse(employee));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeResponse>> Update(int id, CreateEmployeeRequest request)
    {
        var employee = await db.Employees.FindAsync(id);
        if (employee is null) return NotFound();

        if (await db.Employees.AnyAsync(e => e.Email == request.Email && e.Id != id))
            return Conflict(new { message = $"An employee with email {request.Email} already exists." });

        employee.FirstName = request.FirstName;
        employee.LastName = request.LastName;
        employee.Email = request.Email;
        employee.Department = request.Department ?? employee.Department;
        employee.HourlyRate = request.HourlyRate;
        employee.HireDate = request.HireDate;

        await db.SaveChangesAsync();
        return Ok(ToResponse(employee));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var employee = await db.Employees.FindAsync(id);
        if (employee is null) return NotFound();

        db.Employees.Remove(employee);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static EmployeeResponse ToResponse(Employee e) =>
        new(e.Id, e.FirstName, e.LastName, e.Email, e.Department, e.HourlyRate, e.HireDate);
}
