# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source

COPY src/PayrollApi/PayrollApi.csproj src/PayrollApi/
RUN dotnet restore src/PayrollApi/PayrollApi.csproj

COPY src/ src/
RUN dotnet publish src/PayrollApi/PayrollApi.csproj -c Release -o /app --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__Payroll="Data Source=/app/data/payroll.db"
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app

EXPOSE 8080
ENTRYPOINT ["dotnet", "PayrollApi.dll"]
