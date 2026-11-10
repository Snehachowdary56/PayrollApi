using System.ComponentModel.DataAnnotations;

namespace PayrollApi.Dtos;

public record CreateEmployeeRequest(
    [Required, StringLength(100)] string FirstName,
    [Required, StringLength(100)] string LastName,
    [Required, EmailAddress] string Email,
    [StringLength(100)] string? Department,
    [Range(0.01, 1000)] decimal HourlyRate,
    DateOnly HireDate);

public record EmployeeResponse(
    int Id, string FirstName, string LastName, string Email,
    string Department, decimal HourlyRate, DateOnly HireDate);

public record CreateTimesheetRequest(
    DateOnly WorkDate,
    [Range(0, 24)] decimal HoursWorked);

public record TimesheetResponse(int Id, int EmployeeId, DateOnly WorkDate, decimal HoursWorked);
