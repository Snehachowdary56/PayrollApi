namespace PayrollApi.Models;

public class TimesheetEntry
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly WorkDate { get; set; }
    public decimal HoursWorked { get; set; }

    public Employee? Employee { get; set; }
}
