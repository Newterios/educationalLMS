# Capacity Planning Report (Final)

## Scope
Capacity review based on observability metrics (CPU, memory, request rate, error rate) for core services.

## Findings
1. Assessment and payment services show highest burst CPU usage.
2. PostgreSQL is the primary bottleneck under concurrent write load.
3. Gateway remains stable but depends on backend readiness.

## SLI/SLO Context
- Availability target: >= 99%
- Latency target: <= 200ms (project criterion)
- Error rate target: <= 1%

## Scaling Strategy
1. Horizontal scaling
- Increase replicas for assessment/payment from 2 to 3 during peak windows.
- Keep auth/user/course at 2 replicas baseline.

2. Vertical scaling
- Increase DB node memory class when sustained memory > 75%.

3. Database optimization
- Add indexes on high-write/high-filter columns.
- Review connection pool sizing per service.

## Operational Triggers
- CPU > 70% for 10m: scale service replicas +1
- Error rate > 1% for 5m: incident workflow + rollback check
- DB latency p95 > 200ms for 10m: optimize queries / increase DB resources

## Next Iteration
- Add automated load test (k6/Locust) before releases.
- Add Kubernetes HPA once full K8s runtime is production-ready.