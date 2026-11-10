using Microsoft.EntityFrameworkCore;
using PayrollApi.Data;
using PayrollApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Read settings when services are created (not at startup) so tests can override them.
builder.Services.AddDbContext<PayrollDbContext>((sp, options) =>
    options.UseSqlite(sp.GetRequiredService<IConfiguration>().GetConnectionString("Payroll")
                      ?? "Data Source=payroll.db"));

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<IConfiguration>().GetSection("Payroll").Get<PayrollOptions>() ?? new PayrollOptions());
builder.Services.AddSingleton<PayrollCalculator>();

var app = builder.Build();

// Create the database on startup. For a production app you would use EF Core migrations instead.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<PayrollDbContext>().Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();

// Lets the integration tests reference this assembly via WebApplicationFactory<Program>.
public partial class Program { }
