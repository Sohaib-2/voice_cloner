// Helper: Convert File to Base64
export const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Client-side noise reduction
export const applyNoiseReduction = async (audioBuffer: AudioBuffer): Promise<AudioBuffer> => {
  const sampleRate = audioBuffer.sampleRate;
  const context = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    sampleRate
  );

  const source = context.createBufferSource();
  source.buffer = audioBuffer;

  const highPassFilter = context.createBiquadFilter();
  highPassFilter.type = "highpass";
  highPassFilter.frequency.value = 80;
  highPassFilter.Q.value = 1;

  source.connect(highPassFilter);
  highPassFilter.connect(context.destination);
  source.start(0);

  return await context.startRendering();
};

// Convert AudioBuffer to WAV blob
export const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
  setUint16(buffer.numberOfChannels * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
};

// Process audio file
export const processAudioFile = async (
  audioFile: File,
  regionStart: number,
  regionEnd: number,
  removeNoise: boolean
): Promise<File> => {
  const audioContext = new AudioContext();
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(regionStart * sampleRate);
  const endSample = Math.floor(regionEnd * sampleRate);
  const trimmedLength = endSample - startSample;

  const trimmedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const trimmedData = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < trimmedLength; i++) {
      trimmedData[i] = channelData[startSample + i];
    }
  }

  let finalBuffer = trimmedBuffer;
  if (removeNoise) {
    finalBuffer = await applyNoiseReduction(trimmedBuffer);
  }

  const wavBlob = await audioBufferToWav(finalBuffer);
  return new File([wavBlob], audioFile.name, { type: "audio/wav" });
};
