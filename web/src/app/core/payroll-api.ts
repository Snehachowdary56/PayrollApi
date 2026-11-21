import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee, EmployeeInput, PayStub, Timesheet } from './models';
import { calculatePay } from './payroll-calculator';

/** The front end talks to this interface, so the real API and the demo store are interchangeable. */
export abstract class PayrollApi {
  abstract listEmployees(department?: string): Observable<Employee[]>;
  abstract createEmployee(input: EmployeeInput): Observable<Employee>;
  abstract updateEmployee(id: number, input: EmployeeInput): Observable<Employee>;
  abstract deleteEmployee(id: number): Observable<void>;
  abstract listTimesheets(employeeId: number, from?: string, to?: string): Observable<Timesheet[]>;
  abstract addTimesheet(employeeId: number, workDate: string, hoursWorked: number): Observable<Timesheet>;
  abstract deleteTimesheet(employeeId: number, id: number): Observable<void>;
  abstract payStub(employeeId: number, from: string, to: string): Observable<PayStub>;
}

/** Turns HTTP errors into plain messages (the API returns { message } for 400 and 409). */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.error?.message) return err.error.message;
    if (err.status === 404) return 'Not found.';
    if (err.status === 400 && err.error?.errors) return Object.values(err.error.errors).flat().join(' ');
    if (err.status === 0) return 'Cannot reach the API. Is it running?';
    return `Request failed (HTTP ${err.status}).`;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

@Injectable()
export class HttpPayrollApi extends PayrollApi {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  listEmployees(department?: string) {
    const params = department ? new HttpParams().set('department', department) : undefined;
    return this.http.get<Employee[]>(`${this.base}/employees`, { params });
  }
  createEmployee(input: EmployeeInput) {
    return this.http.post<Employee>(`${this.base}/employees`, input);
  }
  updateEmployee(id: number, input: EmployeeInput) {
    return this.http.put<Employee>(`${this.base}/employees/${id}`, input);
  }
  deleteEmployee(id: number) {
    return this.http.delete<void>(`${this.base}/employees/${id}`);
  }
  listTimesheets(employeeId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Timesheet[]>(`${this.base}/employees/${employeeId}/timesheets`, { params });
  }
  addTimesheet(employeeId: number, workDate: string, hoursWorked: number) {
    return this.http.post<Timesheet>(`${this.base}/employees/${employeeId}/timesheets`, { workDate, hoursWorked });
  }
  deleteTimesheet(employeeId: number, id: number) {
    return this.http.delete<void>(`${this.base}/employees/${employeeId}/timesheets/${id}`);
  }
  payStub(employeeId: number, from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PayStub>(`${this.base}/employees/${employeeId}/payroll`, { params });
  }
}

/** In-browser store for the GitHub Pages demo. Applies the same rules as the API (unique email, one entry per day, 0-24 hours). */
@Injectable()
export class DemoPayrollApi extends PayrollApi {
  private employees: Employee[] = [
    { id: 1, firstName: 'Asha', lastName: 'Rao', email: 'asha.rao@example.com', department: 'Engineering', hourlyRate: 42, hireDate: '2024-03-01' },
    { id: 2, firstName: 'Liam', lastName: 'Chen', email: 'liam.chen@example.com', department: 'Finance', hourlyRate: 35.5, hireDate: '2023-09-15' },
    { id: 3, firstName: 'Maya', lastName: 'Singh', email: 'maya.singh@example.com', department: 'Engineering', hourlyRate: 38, hireDate: '2025-01-06' },
  ];
  private timesheets: Timesheet[] = [];
  private nextEmployeeId = 4;
  private nextTimesheetId = 1;

  constructor() {
    super();
    // Asha works 9 hours a day Monday to Friday for two weeks: 45 hours a week, so 5 overtime hours each week.
    for (const day of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
                       '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']) {
      this.timesheets.push({ id: this.nextTimesheetId++, employeeId: 1, workDate: day, hoursWorked: 9 });
    }
  }

  private fail<T>(message: string): Observable<T> {
    return throwError(() => new Error(message));
  }

  listEmployees(department?: string) {
    const list = department
      ? this.employees.filter((e) => e.department.toLowerCase() === department.toLowerCase())
      : this.employees;
    return of([...list].sort((a, b) => a.lastName.localeCompare(b.lastName)));
  }
  createEmployee(input: EmployeeInput) {
    if (this.employees.some((e) => e.email.toLowerCase() === input.email.toLowerCase())) {
      return this.fail<Employee>(`An employee with email ${input.email} already exists.`);
    }
    const employee = { ...input, department: input.department || 'General', id: this.nextEmployeeId++ };
    this.employees.push(employee);
    return of(employee);
  }
  updateEmployee(id: number, input: EmployeeInput) {
    const existing = this.employees.find((e) => e.id === id);
    if (!existing) return this.fail<Employee>('Not found.');
    if (this.employees.some((e) => e.id !== id && e.email.toLowerCase() === input.email.toLowerCase())) {
      return this.fail<Employee>(`An employee with email ${input.email} already exists.`);
    }
    Object.assign(existing, input, { department: input.department || 'General' });
    return of({ ...existing });
  }
  deleteEmployee(id: number) {
    this.employees = this.employees.filter((e) => e.id !== id);
    this.timesheets = this.timesheets.filter((t) => t.employeeId !== id);
    return of(undefined);
  }
  listTimesheets(employeeId: number, from?: string, to?: string) {
    return of(this.timesheets
      .filter((t) => t.employeeId === employeeId && (!from || t.workDate >= from) && (!to || t.workDate <= to))
      .sort((a, b) => a.workDate.localeCompare(b.workDate)));
  }
  addTimesheet(employeeId: number, workDate: string, hoursWorked: number) {
    if (!this.employees.some((e) => e.id === employeeId)) return this.fail<Timesheet>('Not found.');
    if (hoursWorked < 0 || hoursWorked > 24) return this.fail<Timesheet>('Hours must be between 0 and 24.');
    if (this.timesheets.some((t) => t.employeeId === employeeId && t.workDate === workDate)) {
      return this.fail<Timesheet>(`A timesheet entry for ${workDate} already exists.`);
    }
    const entry = { id: this.nextTimesheetId++, employeeId, workDate, hoursWorked };
    this.timesheets.push(entry);
    return of(entry);
  }
  deleteTimesheet(employeeId: number, id: number) {
    this.timesheets = this.timesheets.filter((t) => !(t.employeeId === employeeId && t.id === id));
    return of(undefined);
  }
  payStub(employeeId: number, from: string, to: string) {
    const employee = this.employees.find((e) => e.id === employeeId);
    if (!employee) return this.fail<PayStub>('Not found.');
    if (to < from) return this.fail<PayStub>("'to' must be on or after 'from'.");
    const days = this.timesheets.filter((t) => t.employeeId === employeeId).map((t) => ({ date: t.workDate, hours: t.hoursWorked }));
    try {
      return of(calculatePay(employee.hourlyRate, days, from, to));
    } catch (e) {
      return this.fail<PayStub>((e as Error).message);
    }
  }
}

export const providePayrollApi = () => ({
  provide: PayrollApi,
  useClass: environment.demo ? DemoPayrollApi : HttpPayrollApi,
});

