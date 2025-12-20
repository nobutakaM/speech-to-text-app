import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-live-2.5-flash-preview';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Create server/.env (see README).');
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });
const ai = new GoogleGenAI({ apiKey: API_KEY });

function safeSend(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch {}
}

wss.on('connection', async (clientWs) => {
  let session = null;

  safeSend(clientWs, { type:'status', status:'client_connected' });

  try {
    session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.TEXT],
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (msg) => {
          const t = msg?.serverContent?.inputTranscription?.text;
          if (t) safeSend(clientWs, { type:'transcript', text: t });
          if (msg?.text) safeSend(clientWs, { type:'model_text', text: msg.text });
        },
        onerror: (e) => safeSend(clientWs, { type:'error', message: e?.message || String(e) }),
        onclose: (e) => safeSend(clientWs, { type:'closed', reason: e?.reason || 'closed' }),
      },
    });

    safeSend(clientWs, { type:'status', status:'gemini_connected' });

    clientWs.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'audio' && typeof msg.base64 === 'string') {
        session.sendRealtimeInput({
          audio: { data: msg.base64, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (msg.type === 'audioStreamEnd') {
        session.sendRealtimeInput({ audioStreamEnd: true });
      }
    });

    clientWs.on('close', () => {
      try { session?.close(); } catch {}
    });
  } catch (e) {
    safeSend(clientWs, { type:'error', message: e?.message || String(e) });
    try { session?.close(); } catch {}
    try { clientWs.close(); } catch {}
  }
});

console.log(`WS proxy listening on ws://localhost:${PORT}`);
