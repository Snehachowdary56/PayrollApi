namespace PayrollApi.Models;

public class Employee
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public string Department { get; set; } = "General";
    public decimal HourlyRate { get; set; }
    public DateOnly HireDate { get; set; }

    public List<TimesheetEntry> Timesheets { get; set; } = [];
}
