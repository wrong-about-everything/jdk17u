import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 80,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 80, duration: '2m' },
        { target: 400, duration: '1m' },
        { target: 400, duration: '5m' },
        { target: 120, duration: '2m' },
      ],
    },
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const cid = `spike-${__VU}-${__ITER}-${Date.now()}`;
  const res = http.post(
    `${BASE}/orders`,
    JSON.stringify({
      customerId: `c-${Math.floor(Math.random() * 5000)}`,
      items: [{ sku: 'SKU-HOT', qty: 5 }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': cid,
        'Idempotency-Key': `idem-spike-${Math.floor(Math.random() * 100)}`,
      },
    }
  );

  check(res, {
    'status < 500': (r) => r.status < 500,
  });
}
