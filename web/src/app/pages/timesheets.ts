import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee, Timesheet } from '../core/models';
import { PayrollApi, errorMessage } from '../core/payroll-api';

@Component({
  selector: 'app-timesheets',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Timesheets</h2>
    <label class="inline">Employee
      <select aria-label="Employee" (change)="select(+$any($event.target).value)">
        @for (e of employees(); track e.id) {
          <option [value]="e.id" [selected]="e.id === employeeId()">{{ e.firstName }} {{ e.lastName }}</option>
        }
      </select>
    </label>

    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

    <table aria-label="Timesheet entries">
      <thead><tr><th>Date</th><th>Hours</th><th></th></tr></thead>
      <tbody>
        @for (t of entries(); track t.id) {
          <tr><td>{{ t.workDate }}</td><td>{{ t.hoursWorked }}</td>
            <td><button type="button" class="danger" (click)="remove(t)">Delete</button></td></tr>
        } @empty {
          <tr><td colspan="3">No hours logged yet.</td></tr>
        }
      </tbody>
      <tfoot><tr><th>Total</th><th>{{ total() }}</th><th></th></tr></tfoot>
    </table>

    <h3>Log hours</h3>
    <form [formGroup]="form" (ngSubmit)="add()" novalidate>
      <label>Date <input type="date" formControlName="workDate" /></label>
      <label>Hours <input type="number" step="0.25" formControlName="hoursWorked" /></label>
      @if (form.invalid && form.touched) { <p class="error" role="alert">Enter a date and between 0 and 24 hours.</p> }
      <button type="submit" [disabled]="!employeeId()">Add entry</button>
    </form>
  `,
})
export class TimesheetsPage implements OnInit {
  private api = inject(PayrollApi);
  private fb = inject(FormBuilder);

  employees = signal<Employee[]>([]);
  employeeId = signal<number | null>(null);
  entries = signal<Timesheet[]>([]);
  error = signal('');
  total = computed(() => this.entries().reduce((sum, t) => sum + t.hoursWorked, 0));

  form = this.fb.nonNullable.group({
    workDate: ['', Validators.required],
    hoursWorked: [8, [Validators.required, Validators.min(0), Validators.max(24)]],
  });

  ngOnInit() {
    this.api.listEmployees().subscribe((list) => {
      this.employees.set(list);
      if (list.length) this.select(list[0].id);
    });
  }

  select(id: number) {
    this.employeeId.set(id);
    this.api.listTimesheets(id).subscribe({
      next: (list) => this.entries.set(list),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  add() {
    this.form.markAllAsTouched();
    const id = this.employeeId();
    if (this.form.invalid || !id) return;
    const { workDate, hoursWorked } = this.form.getRawValue();
    this.api.addTimesheet(id, workDate, hoursWorked).subscribe({
      next: () => { this.error.set(''); this.form.reset({ workDate: '', hoursWorked: 8 }); this.select(id); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  remove(t: Timesheet) {
    this.api.deleteTimesheet(t.employeeId, t.id).subscribe(() => this.select(t.employeeId));
  }
}
