export class MockTranscriptionSession {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this._timer = null;
    this._i = 0;
  }
  connect() {
    this.onMessage({ type: 'status', status: 'connected' });
  }
  start() {
    const samples = [
      'こんにちは。テスト用のモック文字起こしです。',
      'Gemini Live API の代わりに、この文章を定期的に追加します。',
      '開始と停止、コピー、保存などのUI動作を確認できます。'
    ];
    this._timer = setInterval(() => {
      const text = samples[this._i % samples.length];
      this._i++;
      this.onMessage({ type: 'transcript', text });
    }, 700);
  }
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this.onMessage({ type: 'status', status: 'stopped' });
  }
  sendAudioBase64(_b64) {}
  close() { this.stop(); this.onMessage({ type:'status', status:'closed' }); }
}
