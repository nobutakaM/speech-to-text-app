import { floatTo16BitPCM, arrayBufferToBase64, nowTimestamp, downloadText } from './utils.js';
import { MockTranscriptionSession } from './mock.js';

const qs = new URLSearchParams(location.search);
const isMock = qs.get('mock') === '1';

const startBtn = document.querySelector('#startBtn');
const stopBtn = document.querySelector('#stopBtn');
const clearBtn = document.querySelector('#clearBtn');
const copyBtn = document.querySelector('#copyBtn');
const saveBtn = document.querySelector('#saveBtn');
const tsToggle = document.querySelector('#tsToggle');
const autoReconnectToggle = document.querySelector('#autoReconnectToggle');

const interimEl = document.querySelector('#interimText');
const finalEl = document.querySelector('#finalText');
const statusEl = document.querySelector('#status');
const modePill = document.querySelector('#modePill');
modePill.textContent = isMock ? 'MOCK' : 'LIVE';

let running = false;

function appendFinal(text) {
  const line = tsToggle.checked ? `[${nowTimestamp()}] ${text}` : text;
  finalEl.value += (finalEl.value ? '\n' : '') + line;
  finalEl.scrollTop = finalEl.scrollHeight;
}

class LiveWsSession {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.ws = null;
    this._manualClose = false;
  }
  connect() {
    this._manualClose = false;
    this.ws = new WebSocket('ws://localhost:8787');
    this.ws.onopen = () => this.onMessage({ type:'status', status:'connected' });
    this.ws.onclose = () => {
      this.onMessage({ type:'status', status:'disconnected' });
      if (!this._manualClose && autoReconnectToggle.checked && running) {
        setTimeout(() => this.connect(), 700);
      }
    };
    this.ws.onerror = () => this.onMessage({ type:'error', message:'WebSocket error' });
    this.ws.onmessage = (ev) => {
      try { this.onMessage(JSON.parse(ev.data)); }
      catch { this.onMessage({ type:'error', message:'Bad message' }); }
    };
  }
  start() {}
  stop() { try { this.ws?.send(JSON.stringify({ type:'audioStreamEnd' })); } catch {} }
  sendAudioBase64(base64) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type:'audio', base64 }));
  }
  close() { this._manualClose = true; try { this.ws?.close(); } catch {} }
}

function handleSessionMessage(msg) {
  if (msg.type === 'status') {
    statusEl.textContent = msg.status;
  } else if (msg.type === 'transcript') {
    interimEl.textContent = '';
    appendFinal(msg.text);
  } else if (msg.type === 'interim') {
    interimEl.textContent = msg.text;
  } else if (msg.type === 'error') {
    statusEl.textContent = 'error';
    appendFinal('[ERR] ' + (msg.message || 'unknown'));
  }
}

const session = isMock ? new MockTranscriptionSession(handleSessionMessage) : new LiveWsSession(handleSessionMessage);

let audioCtx = null;
let stream = null;
let node = null;
let workletNode = null;

async function startCapture() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const src = audioCtx.createMediaStreamSource(stream);

  if (audioCtx.audioWorklet) {
    try {
      await audioCtx.audioWorklet.addModule(new URL('./mic-worklet.js', import.meta.url));
      workletNode = new AudioWorkletNode(audioCtx, 'mic-capture-processor');
      workletNode.port.onmessage = (e) => {
        const f32 = e.data;
        const i16 = floatTo16BitPCM(f32);
        session.sendAudioBase64(arrayBufferToBase64(i16.buffer));
      };
      src.connect(workletNode);
      return;
    } catch {}
  }

  const proc = audioCtx.createScriptProcessor(4096, 1, 1);
  proc.onaudioprocess = (e) => {
    const f32 = e.inputBuffer.getChannelData(0);
    const i16 = floatTo16BitPCM(f32);
    session.sendAudioBase64(arrayBufferToBase64(i16.buffer));
  };
  src.connect(proc);
  proc.connect(audioCtx.destination);
  node = proc;
}

async function stopCapture() {
  try { session.stop(); } catch {}
  try { workletNode?.disconnect(); } catch {}
  try { node?.disconnect(); } catch {}
  try { stream?.getTracks()?.forEach(t => t.stop()); } catch {}
  try { await audioCtx?.close(); } catch {}
  audioCtx = null;
  stream = null;
  node = null;
  workletNode = null;
}

async function onStart() {
  if (running) return;
  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;

  session.connect();

  if (isMock) {
    session.start();
    statusEl.textContent = 'connected (mock)';
    return;
  }

  statusEl.textContent = 'connecting...';
  try {
    await startCapture();
    statusEl.textContent = 'streaming';
  } catch {
    appendFinal('[ERR] mic permission failed');
    statusEl.textContent = 'mic error';
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function onStop() {
  if (!running) return;
  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;

  try { await stopCapture(); } catch {}
  try { session.close(); } catch {}
  statusEl.textContent = 'stopped';
}

function onClear() { interimEl.textContent = ''; finalEl.value = ''; }

async function onCopy() {
  try { await navigator.clipboard.writeText(finalEl.value); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = finalEl.value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

function onSave() {
  const name = `transcript_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
  downloadText(name, finalEl.value);
}

startBtn.addEventListener('click', onStart);
stopBtn.addEventListener('click', onStop);
clearBtn.addEventListener('click', onClear);
copyBtn.addEventListener('click', onCopy);
saveBtn.addEventListener('click', onSave);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); running ? onStop() : onStart(); }
  if (e.code === 'Escape') { e.preventDefault(); onClear(); }
});

statusEl.textContent = isMock ? 'mock ready' : 'ready';
