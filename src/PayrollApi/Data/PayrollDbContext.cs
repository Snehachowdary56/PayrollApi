using Microsoft.EntityFrameworkCore;
using PayrollApi.Models;

namespace PayrollApi.Data;

public class PayrollDbContext(DbContextOptions<PayrollDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<TimesheetEntry> Timesheets => Set<TimesheetEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Employee>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.FirstName).HasMaxLength(100);
            e.Property(x => x.LastName).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.HourlyRate).HasPrecision(10, 2);
        });

        modelBuilder.Entity<TimesheetEntry>(t =>
        {
            // One timesheet entry per employee per day.
            t.HasIndex(x => new { x.EmployeeId, x.WorkDate }).IsUnique();
            t.Property(x => x.HoursWorked).HasPrecision(5, 2);
            t.HasOne(x => x.Employee)
             .WithMany(e => e.Timesheets)
             .HasForeignKey(x => x.EmployeeId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
