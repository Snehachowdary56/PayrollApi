import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { DemoPayrollApi, HttpPayrollApi, errorMessage } from './payroll-api';

describe('HttpPayrollApi', () => {
  let api: HttpPayrollApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HttpPayrollApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(HttpPayrollApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filters employees by department with a query parameter', () => {
    api.listEmployees('Finance').subscribe();
    const req = http.expectOne((r) => r.url === '/api/employees' && r.params.get('department') === 'Finance');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('posts a timesheet entry to the employee route', () => {
    api.addTimesheet(7, '2026-11-02', 8).subscribe();
    const req = http.expectOne('/api/employees/7/timesheets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ workDate: '2026-11-02', hoursWorked: 8 });
    req.flush({ id: 1, employeeId: 7, workDate: '2026-11-02', hoursWorked: 8 });
  });

  it('asks for a pay stub with from and to dates', () => {
    api.payStub(3, '2026-11-01', '2026-11-15').subscribe();
    const req = http.expectOne((r) => r.url === '/api/employees/3/payroll');
    expect(req.request.params.get('from')).toBe('2026-11-01');
    expect(req.request.params.get('to')).toBe('2026-11-15');
    req.flush({});
  });

  it('updates and deletes with PUT and DELETE', () => {
    api.updateEmployee(2, { firstName: 'A', lastName: 'B', email: 'a@b.com', department: 'X', hourlyRate: 10, hireDate: '2026-01-01' }).subscribe();
    expect(http.expectOne('/api/employees/2').request.method).toBe('PUT');
    api.deleteEmployee(2).subscribe();
    expect(http.expectOne('/api/employees/2').request.method).toBe('DELETE');
    http.match(() => true).forEach((r) => r.flush(null));
  });
});

describe('errorMessage', () => {
  it('shows the API message for a conflict', () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'An employee with email a@b.com already exists.' } });
    expect(errorMessage(err)).toContain('already exists');
  });

  it('explains when the API cannot be reached', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the API');
  });
});

describe('DemoPayrollApi', () => {
  it('rejects a duplicate email, like the API', async () => {
    const api = new DemoPayrollApi();
    await expect(firstValueFrom(api.createEmployee({
      firstName: 'X', lastName: 'Y', email: 'ASHA.RAO@example.com', department: '', hourlyRate: 10, hireDate: '2026-01-01',
    }))).rejects.toThrow('already exists');
  });

  it('allows only one timesheet entry per employee per day', async () => {
    const api = new DemoPayrollApi();
    await expect(firstValueFrom(api.addTimesheet(1, '2026-11-02', 4))).rejects.toThrow('already exists');
    const added = await firstValueFrom(api.addTimesheet(2, '2026-11-02', 4));
    expect(added.employeeId).toBe(2);
  });

  it('calculates the seeded overtime pay stub', async () => {
    const api = new DemoPayrollApi();
    const stub = await firstValueFrom(api.payStub(1, '2026-11-02', '2026-11-15'));
    expect(stub.regularHours).toBe(80);
    expect(stub.overtimeHours).toBe(10);
    expect(stub.grossPay).toBe(80 * 42 + 10 * 42 * 1.5);
  });
});
