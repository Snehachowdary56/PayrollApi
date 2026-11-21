# Bug write-ups

What went wrong while building and deploying the Payroll app, why, the fix, and what stops it coming back.
The deployment ones were found the first time the API went to Microsoft Azure App Service (Linux, F1 plan).

## 1. App service plan could not be created (region policy)

**Symptom.** `az appservice plan create` failed: first with a quota of 0 for the free F1 tier in the default region,
then with a policy error in other regions.

**Cause.** The Azure for Students subscription has an Azure Policy that allows only a few regions
(`canadacentral`, `belgiumcentral`, `francecentral`, `westus2`, `northcentralus`), and F1 quota differs by region.

**Fix.** Read the allowed regions from the policy assignment and created the plan in `belgiumcentral`, which had F1 quota.

**Prevention.** The README deploy steps name the region and say why, so the next deploy does not guess.

## 2. Web app rejected the runtime name

**Symptom.** `az webapp create ... --runtime "dotnet:10"` failed with an unknown runtime.

**Cause.** Linux App Service names .NET runtimes as `DOTNETCORE:<version>`; `dotnet:10` is not a valid value
(and `az webapp up`, which picks it for you, is retired).

**Fix.** Used the Linux runtime name `--runtime "DOTNETCORE:10.0"` and created the app step by step instead of with `az webapp up`.

**Prevention.** The README uses the explicit step-by-step commands with the correct runtime name.

## 3. Zip deploy failed with HTTP 400

**Symptom.** `az webapp deploy --type zip` returned 400 from the Kudu deployment service.

**Cause.** The zip was made with Windows PowerShell's `Compress-Archive`, which the Linux deployment service rejected,
and App Service was also trying to build the uploaded source on the server.

**Fix.** Publish locally with `dotnet publish -c Release -o publish`, zip the output with `tar -a`, and set
`SCM_DO_BUILD_DURING_DEPLOYMENT=false` so App Service runs the published files as they are.

**Prevention.** The README deploy steps build locally and zip the published output, not the source.

## 4. Site deployed but would not start

**Symptom.** The deploy succeeded, but the site did not start and returned an error page.

**Cause.** App Service did not know which assembly to run for this layout.

**Fix.** `az webapp config set --startup-file "dotnet PayrollApi.dll"`, then restart. Swagger came up and
`POST /api/employees` returned 201.

**Prevention.** The startup command is part of the README deploy steps.

## 5. Angular timesheet test failed: wrong first employee

**Symptom.** A Vitest test for the timesheet page failed: it expected 10 days and 90 hours but got a different employee's hours.

**Cause.** The test assumed which employee the page selects by default; that employee was not the one with the 10 seeded days.

**Fix.** The test now selects employee 1 (Asha, 10 seeded days of 9 hours) explicitly before checking the total.

**Prevention.** Tests choose the record they depend on instead of relying on a default, so changing the default does not break them.
