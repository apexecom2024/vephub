class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Default buffer size
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      if (this.bytesWritten + channelData.length > this.bufferSize) {
        // Send buffer when full 
        this.port.postMessage(this.buffer);
        // Reset and start filling again
        let initialDataRemaining = (this.bytesWritten + channelData.length) - this.bufferSize;
        this.buffer = new Float32Array(this.bufferSize);
        this.bytesWritten = 0;
        if (initialDataRemaining > 0) {
           this.buffer.set(channelData.subarray(channelData.length - initialDataRemaining), 0);
           this.bytesWritten = initialDataRemaining;
        }
      } else {
        this.buffer.set(channelData, this.bytesWritten);
        this.bytesWritten += channelData.length;
      }
    }
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
