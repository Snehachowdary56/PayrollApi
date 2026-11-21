import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee, PayStub } from '../core/models';
import { PayrollApi, errorMessage } from '../core/payroll-api';

@Component({
  selector: 'app-payroll',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <h2>Pay stub</h2>
    <form [formGroup]="form" (ngSubmit)="calculate()" novalidate>
      <label>Employee
        <select formControlName="employeeId">
          @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
        </select>
      </label>
      <label>From <input type="date" formControlName="from" /></label>
      <label>To <input type="date" formControlName="to" /></label>
      <button type="submit">Calculate</button>
    </form>

    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

    @if (stub(); as s) {
      <table aria-label="Pay stub">
        <tbody>
          <tr><th>Period</th><td>{{ s.periodStart }} to {{ s.periodEnd }}</td></tr>
          <tr><th>Regular hours</th><td>{{ s.regularHours }}</td></tr>
          <tr><th>Overtime hours</th><td>{{ s.overtimeHours }}</td></tr>
          <tr><th>Regular pay</th><td>{{ s.regularPay | currency: 'CAD' }}</td></tr>
          <tr><th>Overtime pay (1.5x)</th><td>{{ s.overtimePay | currency: 'CAD' }}</td></tr>
          <tr><th>Gross pay</th><td>{{ s.grossPay | currency: 'CAD' }}</td></tr>
          <tr><th>Tax</th><td>{{ s.taxDeduction | currency: 'CAD' }}</td></tr>
          <tr class="net"><th>Net pay</th><td>{{ s.netPay | currency: 'CAD' }}</td></tr>
        </tbody>
      </table>
    }
  `,
})
export class PayrollPage implements OnInit {
  private api = inject(PayrollApi);
  private fb = inject(FormBuilder);

  employees = signal<Employee[]>([]);
  stub = signal<PayStub | null>(null);
  error = signal('');

  form = this.fb.nonNullable.group({
    employeeId: [0, Validators.min(1)],
    from: ['2026-11-02', Validators.required],
    to: ['2026-11-15', Validators.required],
  });

  ngOnInit() {
    this.api.listEmployees().subscribe((list) => {
      this.employees.set(list);
      if (list.length && !this.form.value.employeeId) this.form.patchValue({ employeeId: list[0].id });
    });
  }

  calculate() {
    const { employeeId, from, to } = this.form.getRawValue();
    if (this.form.invalid) return;
    this.api.payStub(employeeId, from, to).subscribe({
      next: (s) => { this.error.set(''); this.stub.set(s); },
      error: (e) => { this.stub.set(null); this.error.set(errorMessage(e)); },
    });
  }
}
