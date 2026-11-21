import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DemoPayrollApi, PayrollApi } from '../core/payroll-api';
import { EmployeesPage } from './employees';
import { PayrollPage } from './payroll';
import { TimesheetsPage } from './timesheets';

function setup<T>(component: Type<T>) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([]), { provide: PayrollApi, useClass: DemoPayrollApi }],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

describe('EmployeesPage', () => {
  it('lists employees and filters by department', async () => {
    const fixture = setup(EmployeesPage);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
    fixture.componentInstance.filter('Engineering');
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('does not save an invalid form and shows a message', async () => {
    const fixture = setup(EmployeesPage);
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('valid email');
    expect(fixture.componentInstance.employees().length).toBe(3);
  });

  it('adds a valid employee', async () => {
    const fixture = setup(EmployeesPage);
    const page = fixture.componentInstance;
    page.form.setValue({ firstName: 'Noor', lastName: 'Ali', email: 'noor.ali@example.com', department: 'HR', hourlyRate: 30, hireDate: '2026-11-01' });
    page.save();
    fixture.detectChanges();
    expect(page.employees().some((e) => e.email === 'noor.ali@example.com')).toBe(true);
  });

  it('shows the duplicate email message from the API', async () => {
    const fixture = setup(EmployeesPage);
    const page = fixture.componentInstance;
    page.form.setValue({ firstName: 'A', lastName: 'B', email: 'liam.chen@example.com', department: '', hourlyRate: 30, hireDate: '2026-11-01' });
    page.save();
    fixture.detectChanges();
    expect(page.error()).toContain('already exists');
  });
});

describe('TimesheetsPage', () => {
  it('shows an employee’s hours and their total', () => {
    const fixture = setup(TimesheetsPage);
    fixture.componentInstance.select(1); // Asha has 10 seeded days of 9 hours
    fixture.detectChanges();
    expect(fixture.componentInstance.total()).toBe(90);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(10);
  });

  it('refuses a second entry on the same day', () => {
    const fixture = setup(TimesheetsPage);
    const page = fixture.componentInstance;
    page.select(1);
    page.form.setValue({ workDate: '2026-11-02', hoursWorked: 4 });
    page.add();
    expect(page.error()).toContain('already exists');
  });
});

describe('PayrollPage', () => {
  it('renders a pay stub with net pay', async () => {
    const fixture = setup(PayrollPage);
    const page = fixture.componentInstance;
    page.form.patchValue({ employeeId: 1 });
    page.calculate();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Net pay');
    expect(page.stub()?.overtimeHours).toBe(10);
  });

  it('shows an error when the period is backwards', () => {
    const fixture = setup(PayrollPage);
    const page = fixture.componentInstance;
    page.form.patchValue({ employeeId: 1, from: '2026-11-15', to: '2026-11-01' });
    page.calculate();
    expect(page.error()).toContain('on or after');
  });
});
