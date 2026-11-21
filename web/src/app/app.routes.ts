import { Routes } from '@angular/router';
import { EmployeesPage } from './pages/employees';
import { PayrollPage } from './pages/payroll';
import { TimesheetsPage } from './pages/timesheets';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  { path: 'employees', component: EmployeesPage, title: 'Employees' },
  { path: 'timesheets', component: TimesheetsPage, title: 'Timesheets' },
  { path: 'payroll', component: PayrollPage, title: 'Pay stub' },
  { path: '**', redirectTo: 'employees' },
];
