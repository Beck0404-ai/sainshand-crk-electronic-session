/**
 * Web Audio API-д суурилсан дуут дохионы чагнуурууд.
 * Браузерын стандартын AudioContext ашиглах тул гадны аудио файл ачаалах шаардлагагүй.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Микрофоны цаг дуусахад дуугарах дохио (Сэрүүлэг / Gong)
 */
export function playTimerEndSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Сэрүүлгийн 3 дараалсан дохио
    [0, 0.2, 0.4].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + offset); // A5 нот
      osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.15);

      gain.gain.setValueAtTime(0.3, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  } catch (e) {
    console.warn('Audio playback not allowed or failed:', e);
  }
}

/**
 * Санал асуулга эхлэхэд дуугарах мэдээллийн дохио (Chime)
 */
export function playVoteStartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Хоёр дараалсан тод нот (C5 -> G5)
    const notes = [523.25, 783.99];
    notes.forEach((freq, idx) => {
      const offset = idx * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  } catch (e) {
    console.warn('Audio playback not allowed or failed:', e);
  }
}
