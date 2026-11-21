import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './app.css',
  template: `
    <header>
      <h1>Payroll</h1>
      <nav aria-label="Main">
        <a routerLink="/employees" routerLinkActive="active">Employees</a>
        <a routerLink="/timesheets" routerLinkActive="active">Timesheets</a>
        <a routerLink="/payroll" routerLinkActive="active">Pay stub</a>
      </nav>
    </header>
    @if (demo) {
      <p class="banner" role="note">Demo mode: made-up data stored in your browser, using the same payroll rules as the ASP.NET Core API.</p>
    }
    <main><router-outlet /></main>
  `,
})
export class App {
  protected readonly demo = environment.demo;
}
