import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Employee, EmployeeInput } from '../core/models';
import { PayrollApi, errorMessage } from '../core/payroll-api';

@Component({
  selector: 'app-employees',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <h2>Employees</h2>
    <label class="inline">Filter by department
      <input aria-label="Department filter" [value]="department()" (input)="filter($any($event.target).value)" placeholder="e.g. Engineering" />
    </label>

    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

    <table aria-label="Employees">
      <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Hourly rate</th><th>Hire date</th><th></th></tr></thead>
      <tbody>
        @for (e of employees(); track e.id) {
          <tr>
            <td>{{ e.firstName }} {{ e.lastName }}</td><td>{{ e.email }}</td><td>{{ e.department }}</td>
            <td>{{ e.hourlyRate | currency: 'CAD' }}</td><td>{{ e.hireDate }}</td>
            <td><button type="button" (click)="edit(e)">Edit</button> <button type="button" class="danger" (click)="remove(e)">Delete</button></td>
          </tr>
        } @empty {
          <tr><td colspan="6">No employees found.</td></tr>
        }
      </tbody>
    </table>

    <h3>{{ editingId() ? 'Edit employee' : 'Add employee' }}</h3>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <label>First name <input formControlName="firstName" /></label>
      <label>Last name <input formControlName="lastName" /></label>
      <label>Email <input type="email" formControlName="email" /></label>
      <label>Department <input formControlName="department" /></label>
      <label>Hourly rate <input type="number" step="0.01" formControlName="hourlyRate" /></label>
      <label>Hire date <input type="date" formControlName="hireDate" /></label>
      @if (form.invalid && form.touched) {
        <p class="error" role="alert">Please enter a first and last name, a valid email, an hourly rate from 0.01 to 1000 and a hire date.</p>
      }
      <button type="submit">{{ editingId() ? 'Save changes' : 'Add employee' }}</button>
      @if (editingId()) { <button type="button" (click)="cancel()">Cancel</button> }
    </form>
  `,
})
export class EmployeesPage implements OnInit {
  private api = inject(PayrollApi);
  private fb = inject(FormBuilder);

  employees = signal<Employee[]>([]);
  department = signal('');
  error = signal('');
  editingId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    department: ['', [Validators.maxLength(100)]],
    hourlyRate: [0, [Validators.required, Validators.min(0.01), Validators.max(1000)]],
    hireDate: ['', [Validators.required]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.listEmployees(this.department() || undefined).subscribe({
      next: (list) => this.employees.set(list),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  filter(value: string) {
    this.department.set(value.trim());
    this.load();
  }

  edit(e: Employee) {
    this.editingId.set(e.id);
    this.form.setValue({ firstName: e.firstName, lastName: e.lastName, email: e.email,
                         department: e.department, hourlyRate: e.hourlyRate, hireDate: e.hireDate });
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset();
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const input: EmployeeInput = this.form.getRawValue();
    const id = this.editingId();
    const request = id ? this.api.updateEmployee(id, input) : this.api.createEmployee(input);
    request.subscribe({
      next: () => { this.error.set(''); this.cancel(); this.load(); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  remove(e: Employee) {
    this.api.deleteEmployee(e.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
