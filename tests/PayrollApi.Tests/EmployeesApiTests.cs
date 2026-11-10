using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using PayrollApi.Dtos;
using PayrollApi.Services;

namespace PayrollApi.Tests;

/// <summary>
/// Integration tests: these start the real API in memory and call it over HTTP,
/// using a throwaway SQLite database file for each test class.
/// </summary>
public class EmployeesApiTests : IClassFixture<EmployeesApiTests.TestApiFactory>
{
    private readonly HttpClient _client;

    public EmployeesApiTests(TestApiFactory factory) => _client = factory.CreateClient();

    public class TestApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"payroll-test-{Guid.NewGuid()}.db");

        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder.UseSetting("ConnectionStrings:Payroll", $"Data Source={_dbPath}");
    }

    private async Task<EmployeeResponse> CreateEmployee(string email, decimal rate = 20m)
    {
        var response = await _client.PostAsJsonAsync("/api/employees",
            new CreateEmployeeRequest("Test", "User", email, "Engineering", rate, new DateOnly(2026, 1, 5)));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EmployeeResponse>())!;
    }

    [Fact]
    public async Task CreateEmployee_ThenGetById_ReturnsIt()
    {
        var created = await CreateEmployee("alex@example.com");

        var fetched = await _client.GetFromJsonAsync<EmployeeResponse>($"/api/employees/{created.Id}");

        Assert.NotNull(fetched);
        Assert.Equal("alex@example.com", fetched.Email);
    }

    [Fact]
    public async Task CreateEmployee_WithDuplicateEmail_Returns409()
    {
        await CreateEmployee("dup@example.com");

        var response = await _client.PostAsJsonAsync("/api/employees",
            new CreateEmployeeRequest("Other", "Person", "dup@example.com", null, 20m, new DateOnly(2026, 1, 5)));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task GetMissingEmployee_Returns404()
    {
        var response = await _client.GetAsync("/api/employees/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Payroll_EndToEnd_CalculatesOvertime()
    {
        var employee = await CreateEmployee("payroll@example.com", rate: 20m);
        var monday = new DateOnly(2026, 11, 2);

        for (int i = 0; i < 5; i++)
        {
            var post = await _client.PostAsJsonAsync($"/api/employees/{employee.Id}/timesheets",
                new CreateTimesheetRequest(monday.AddDays(i), 9m));
            post.EnsureSuccessStatusCode();
        }

        var stub = await _client.GetFromJsonAsync<PayStub>(
            $"/api/employees/{employee.Id}/payroll?from=2026-11-02&to=2026-11-08");

        Assert.NotNull(stub);
        Assert.Equal(5m, stub.OvertimeHours);
        Assert.Equal(950m, stub.GrossPay);
    }
}
