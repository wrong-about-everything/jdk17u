import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const e2e = new Trend('e2e_order_duration_ms');
const createErrors = new Counter('create_order_errors');

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '20m',
      preAllocatedVUs: 50,
      maxVUs: 300,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<250', 'p(99)<600'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

function correlationId() {
  return `corr-${__VU}-${__ITER}-${Date.now()}`;
}

export default function () {
  const cid = correlationId();
  const hdrs = {
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': cid,
      'Idempotency-Key': `idem-${Math.floor(Math.random() * 50)}`,
    },
  };

  const createPayload = JSON.stringify({
    customerId: `c-${Math.floor(Math.random() * 1000)}`,
    items: [{ sku: 'SKU-1', qty: 1 }, { sku: 'SKU-2', qty: 2 }],
  });

  const t0 = Date.now();
  const create = http.post(`${BASE}/orders`, createPayload, hdrs);

  const okCreate = check(create, {
    'create status 2xx/202': (r) => r.status >= 200 && r.status < 300,
  });

  if (!okCreate) {
    createErrors.add(1);
  }

  if (create.status >= 200 && create.status < 300) {
    const id = create.json('orderId');
    if (id) {
      const getR = http.get(`${BASE}/orders/${id}`, { headers: { 'X-Correlation-Id': cid } });
      check(getR, {
        'get status 200': (r) => r.status === 200,
      });
    }
  }

  e2e.add(Date.now() - t0);
  sleep(0.1);
}
