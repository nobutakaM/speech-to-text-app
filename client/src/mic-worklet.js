class MicCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0];
    this.port.postMessage(ch0.slice(0));
    return true;
  }
}
registerProcessor('mic-capture-processor', MicCaptureProcessor);
