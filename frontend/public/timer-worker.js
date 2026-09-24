// Web Worker for Tamper-Proof CBT Countdown Timer
let timerInterval = null;
let remainingSeconds = 0;

self.onmessage = function (e) {
  const { action, duration } = e.data;

  if (action === 'START') {
    remainingSeconds = duration;
    if (timerInterval) clearInterval(timerInterval);

    self.postMessage({ type: 'TICK', remainingSeconds });

    timerInterval = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        self.postMessage({ type: 'TIME_UP', remainingSeconds: 0 });
      } else {
        self.postMessage({ type: 'TICK', remainingSeconds });
      }
    }, 1000);
  } else if (action === 'STOP') {
    if (timerInterval) clearInterval(timerInterval);
  } else if (action === 'SYNC') {
    remainingSeconds = duration;
  }
};
