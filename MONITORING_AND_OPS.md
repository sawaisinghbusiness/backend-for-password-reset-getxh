# Production Monitoring, Backup & Performance Strategy Guide for GETXH

This document outlines the operational guidelines, monitoring setup, automated database backup workflows, and stress testing strategies for the GETXH production infrastructure.

---

## 1. 📊 Monitoring & Observability

### A. API Errors & Security Event Tracking
1. **Structured Logging Integration**:
   - The backend uses **Winston** structured JSON logging in [src/utils/logger.js](file:///c:/Users/Shivam%20Singh/OneDrive/Desktop/BACKEND%20FOR%20PASSWORD%20RESET%20GETXH/src/utils/logger.js).
   - In production, route Winston logs to a centralized log management tool such as **Better Stack (Logtail)**, **Datadog**, or **Google Cloud Logging**:
     ```bash
     npm install winston-cloudwatch
     # OR
     npm install @google-cloud/logging-winston
     ```

2. **Error Tracking (Sentry Integration)**:
   - Integrate `@sentry/node` into `src/app.js` to get real-time alerts for 5xx API errors and unexpected unhandled exceptions:
     ```js
     const Sentry = require("@sentry/node");
     Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 });
     app.use(Sentry.Handlers.requestHandler());
     // ... app routes ...
     app.use(Sentry.Handlers.errorHandler());
     ```

3. **Failed Logins & Password Reset Audit Alerts**:
   - Filter logs by `event: "WRONG_OTP_ATTEMPT"`, `event: "RATE_LIMIT_EXCEEDED"`, and `event: "PASSWORD_RESET_FAILED"`.
   - Set up alerting thresholds: If `WRONG_OTP_ATTEMPT` > 50 in 5 minutes from a single IP subnet, trigger a Slack or PagerDuty alert for potential brute-force attack.

---

## 2. 💾 Backup & Disaster Recovery Strategy

### A. Automated Firestore Daily Backups
Configure Google Cloud Scheduled Backups for your Firestore database using Google Cloud CLI (`gcloud`):

1. **Enable Cloud Storage Bucket**:
   ```bash
   gcloud storage buckets create gs://getxh-firestore-backups --location=asia-south1
   ```

2. **Automate Daily Backups via Cloud Scheduler**:
   ```bash
   gcloud firestore export gs://getxh-firestore-backups
   ```

3. **Automated Retention Policy**:
   Set up bucket lifecycle management to delete backup snapshots older than 30 days to optimize storage costs:
   ```json
   {
     "rule": [
       {
         "action": {"type": "Delete"},
         "condition": {"age": 30}
       }
     ]
   }
   ```

### B. Server Configuration & Environment Backups
- Keep `.env.production` secrets securely stored in GCP Secret Manager, AWS Secrets Manager, or 1Password/Bitwarden.
- Store infrastructure configuration in private GitHub repositories.

---

## 3. ⚡ Performance & Stress Testing (100+ Concurrent Users)

To ensure the backend handles high burst traffic (e.g., 100+ concurrent password reset or API requests without performance degradation):

### A. Load Testing Script with `k6`
Install Grafana `k6` locally or via CLI (`npm install -g k6`) and run a stress test:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 concurrent users
    { duration: '1m',  target: 100 }, // Hold 100 concurrent users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete in under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

export default function () {
  const url = 'http://localhost:5000/api/forgot-password';
  const payload = JSON.stringify({
    email: `stress_user_${__VU}@getxh.in`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(1);
}
```

### B. Scalability & High Availability Setup
1. **PM2 Cluster Mode**: Run app in cluster mode across multi-core CPUs:
   ```bash
   pm2 start src/server.js -i max --name "getxh-password-reset"
   ```
2. **Firestore Partitioning**: Random document IDs (`password_resets/{randomDocId}`) prevent database key hotspotting during high traffic bursts.
