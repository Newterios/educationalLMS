.PHONY: dev prod down build test clean logs

dev:
	docker-compose -f docker-compose.dev.yml up -d --build

prod:
	docker-compose -f docker-compose.yml up -d --build

down:
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.yml down

build:
	docker-compose -f docker-compose.dev.yml build

test-auth:
	cd services/auth-service && go test ./...

test-user:
	cd services/user-service && go test ./...

test-course:
	cd services/course-service && go test ./...

test-assessment:
	cd services/assessment-service && go test ./...

test-attendance:
	cd services/attendance-service && go test ./...

test-media:
	cd services/media-service && go test ./...

test-analytics:
	cd services/analytics-service && go test ./...

test-payment:
	cd services/payment-service && go test ./...

test-web:
	cd web && npm test

test: test-auth test-user test-course test-assessment test-attendance test-media test-analytics test-payment

logs:
	docker-compose -f docker-compose.dev.yml logs -f

clean:
	docker-compose -f docker-compose.dev.yml down -v --rmi local
	docker-compose -f docker-compose.yml down -v --rmi local

migrate:
	docker-compose -f docker-compose.dev.yml exec postgres psql -U edulms -d edulms -f /docker-entrypoint-initdb.d/init.sql

seed:
	docker-compose -f docker-compose.dev.yml exec postgres psql -U edulms -d edulms -f /docker-entrypoint-initdb.d/seed.sql
