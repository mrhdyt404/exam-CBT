import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test Configuration for 15,000+ Concurrent Students
export const options = {
  stages: [
    { duration: '30s', target: 1000 },   // Warm-up to 1,000 students
    { duration: '1m',  target: 5000 },   // Ramp up to 5,000 students
    { duration: '2m',  target: 15000 },  // Peak 15,000 concurrent students
    { duration: '3m',  target: 15000 },  // Sustained exam duration
    { duration: '1m',  target: 0 },      // Ramp down / submission
  ],
  thresholds: {
    // 95% of answer submissions must complete within 50ms
    'http_req_duration{name:SaveAnswer}': ['p(95)<50', 'p(99)<150'],
    // Total error rate must be below 0.1%
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api/v1';
const EXAM_ID = 'e0000000-0000-0000-0000-000000000001';

export default function () {
  const vuId = __VU;
  const username = `siswa_${vuId % 1000}`; // pool of student usernames

  // 1. Login to get JWT Token
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: 'siswa01', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Login' } }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) return;

  const token = loginRes.json('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Exam Bundle (Static Cached)
  const bundleRes = http.get(`${BASE_URL}/exam/${EXAM_ID}/bundle`, {
    headers: authHeaders,
    tags: { name: 'GetBundle' },
  });

  check(bundleRes, {
    'bundle status is 200': (r) => r.status === 200,
  });

  // 3. Start Exam Session
  const startRes = http.post(`${BASE_URL}/exam/${EXAM_ID}/start`, '{}', {
    headers: authHeaders,
    tags: { name: 'StartSession' },
  });

  check(startRes, {
    'session start is 200': (r) => r.status === 200,
  });

  const questions = [
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005',
  ];
  const optionsList = ['A', 'B', 'C', 'D'];

  // 4. Simulate Student Answering Questions with Heartbeat
  for (let i = 0; i < questions.length; i++) {
    const qId = questions[i];
    const chosenOption = optionsList[Math.floor(Math.random() * optionsList.length)];

    // Send Answer
    const answerRes = http.post(
      `${BASE_URL}/answer/save`,
      JSON.stringify({
        exam_id: EXAM_ID,
        question_id: qId,
        selected_option: chosenOption,
        is_doubt: false,
      }),
      { headers: authHeaders, tags: { name: 'SaveAnswer' } }
    );

    check(answerRes, {
      'save answer is 200': (r) => r.status === 200,
    });

    // Send Heartbeat
    http.post(
      `${BASE_URL}/proctor/heartbeat`,
      JSON.stringify({
        exam_id: EXAM_ID,
        current_number: i + 1,
      }),
      { headers: authHeaders, tags: { name: 'Heartbeat' } }
    );

    // Think time between answering questions (5 - 10 seconds)
    sleep(Math.random() * 5 + 5);
  }

  // 5. Final Exam Submit
  const submitRes = http.post(`${BASE_URL}/exam/${EXAM_ID}/submit`, '{}', {
    headers: authHeaders,
    tags: { name: 'SubmitExam' },
  });

  check(submitRes, {
    'exam submit is 200': (r) => r.status === 200,
  });
}
