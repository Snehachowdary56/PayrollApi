// These match the C# DTOs in src/PayrollApi (EmployeeResponse, CreateEmployeeRequest, TimesheetResponse, PayStub).
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  hourlyRate: number;
  hireDate: string; // yyyy-mm-dd
}

export type EmployeeInput = Omit<Employee, 'id'>;

export interface Timesheet {
  id: number;
  employeeId: number;
  workDate: string; // yyyy-mm-dd
  hoursWorked: number;
}

export interface PayStub {
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  taxDeduction: number;
  netPay: number;
}
