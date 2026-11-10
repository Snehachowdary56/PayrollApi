# Employee Timesheet & Payroll API

A REST API for managing employees, recording timesheets, and calculating pay with weekly overtime and tax deductions. Built with C#, ASP.NET Core, Entity Framework Core and SQLite, tested with xUnit, containerized with Docker, with CI on GitHub Actions.

![CI](https://github.com/Snehachowdary56/PayrollApi/actions/workflows/ci.yml/badge.svg)

## Features

- **Employees**: create, read, update and delete, with filtering by department and unique email validation
- **Timesheets**: log hours worked per day (one entry per employee per day, 0–24 hours)
- **Payroll**: calculate a pay stub for any pay period
  - Overtime is calculated **per week** (Monday–Sunday): hours above 40 are paid at 1.5×
  - A flat tax deduction is applied to gross pay
  - All rules are configurable in `appsettings.json`
- **Swagger UI** for exploring and testing the API in the browser

## Tech stack

| Area | Technology |
|---|---|
| Language / framework | C#, .NET 10, ASP.NET Core Web API |
| Data | Entity Framework Core, SQLite |
| Testing | xUnit (unit + integration tests with `WebApplicationFactory`) |
| DevOps | Docker, GitHub Actions |

## Project structure

```
src/PayrollApi/
  Controllers/   Employees, Timesheets, Payroll endpoints
  Services/      PayrollCalculator: pure business logic, no database
  Models/        Employee, TimesheetEntry entities
  Data/          PayrollDbContext (EF Core)
  Dtos/          Request/response shapes with validation
tests/PayrollApi.Tests/
  PayrollCalculatorTests.cs   Unit tests for overtime, tax, rounding, validation
  EmployeesApiTests.cs        Integration tests that call the real API over HTTP
```

## Run it

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download).

```bash
dotnet run --project src/PayrollApi
```

Then open the URL it prints (e.g. `http://localhost:5000`). It redirects to Swagger.

### Run the tests

```bash
dotnet test
```

### Run with Docker

```bash
docker build -t payroll-api .
docker run -p 8080:8080 payroll-api
```

Open `http://localhost:8080/swagger`.

## Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/employees?department=` | List employees |
| GET | `/api/employees/{id}` | Get one employee |
| POST | `/api/employees` | Create an employee |
| PUT | `/api/employees/{id}` | Update an employee |
| DELETE | `/api/employees/{id}` | Delete an employee and their timesheets |
| GET | `/api/employees/{id}/timesheets?from=&to=` | List timesheet entries |
| POST | `/api/employees/{id}/timesheets` | Log hours for a day |
| DELETE | `/api/employees/{id}/timesheets/{entryId}` | Delete an entry |
| GET | `/api/employees/{id}/payroll?from=&to=` | Calculate a pay stub |

### Example

```bash
# Create an employee
curl -X POST http://localhost:5000/api/employees -H "Content-Type: application/json" \
  -d '{"firstName":"Alex","lastName":"Lee","email":"alex@example.com","department":"Engineering","hourlyRate":20,"hireDate":"2026-01-05"}'

# Log 9 hours on a Monday
curl -X POST http://localhost:5000/api/employees/1/timesheets -H "Content-Type: application/json" \
  -d '{"workDate":"2026-11-02","hoursWorked":9}'

# Get the pay stub for that week
curl "http://localhost:5000/api/employees/1/payroll?from=2026-11-02&to=2026-11-08"
```

## Design decisions

- **Business logic is separated from the API.** `PayrollCalculator` has no database or HTTP dependencies, so the pay rules can be unit tested directly.
- **Overtime is weekly, not per period.** Two 35-hour weeks earn no overtime even though the total is 70 hours, which matches how most labour rules work.
- **Money uses `decimal`** and is rounded to cents (midpoint away from zero) to avoid floating-point errors.

## Ideas for next steps

- Switch from `EnsureCreated` to EF Core migrations
- Add authentication (e.g. JWT) with employee vs. manager roles
- Deploy to Azure App Service with Azure SQL
- Add province-specific overtime rules (e.g. Ontario's 44-hour threshold)
