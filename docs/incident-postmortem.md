# Incident Report and Postmortem (Final)

## Incident Summary
- Date: 2026-05-19
- Service: Assessment Service (equivalent of order-flow critical path in this LMS domain)
- Severity: SEV-2
- Duration: 18 minutes
- Impact: Grade submission endpoints returned 5xx; instructors could not submit new grades.

## Detection
- Alert source: Prometheus rule `HighErrorRateCritical`
- Signal: Error rate above SLO threshold in Grafana dashboard
- User symptom: UI displayed submission failure toast for grade updates

## Timeline (UTC+5)
- 04:10: Alert fired (5xx spike)
- 04:12: On-call acknowledged incident
- 04:15: Logs reviewed (`assessment-service` DB connection errors)
- 04:21: Incorrect DB env value identified
- 04:24: Config corrected and service restarted
- 04:28: Error rate normalized

## Root Cause
Misconfigured database connection environment variable caused failed DB connections during write operations.

## Resolution
- Corrected configuration value
- Restarted affected service
- Confirmed recovery via `/health` and Grafana error-rate panel

## What Went Well
- Monitoring detected issue quickly
- Alert routing was clear
- Service isolation limited blast radius

## What Went Wrong
- Missing config validation during deployment
- No pre-deploy smoke check for critical write endpoint

## Action Items
1. Add startup config validation in service init.
2. Add pre-deploy smoke test for grade submission path.
3. Add runbook step for env validation before restart.
4. Add canary-style rollout for critical services.