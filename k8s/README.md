# Simple Kubernetes deployment for criteria compliance

Apply all manifests:

kubectl apply -f k8s/

Check status:

kubectl get pods,svc,ing -n edulms

Notes:
- Images are expected as: edulms/<service>:latest (build/push them first).
- This setup intentionally keeps infra minimal for final project criteria.
- Includes 6+ microservices, Deployments, Services, ConfigMaps, Secrets, and Ingress.