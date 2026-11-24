'use client'

// Records the microphone in the browser as a 16 kHz mono WAV file, which
// Google Speech-to-Text reads in every browser (Safari's MediaRecorder only
// makes MP4/AAC, which Google does not accept). Stops by itself after a short
// silence once the student has started talking, or at the time limit.

const TARGET_RATE = 16000

export interface RecorderOptions {
  maxSeconds: number
  // Silence (in ms) after speech that ends the recording. 0 = never.
  silenceMs?: number
  // 0–1, for a simple level meter.
  onLevel?: (level: number) => void
  // Called when the recorder stops by itself (silence or time limit).
  onAutoStop?: () => void
}

export interface Recording {
  wav: Blob
  seconds: number
  // false when no sound above the noise level was heard
  heardSpeech: boolean
}

type AudioContextCtor = typeof AudioContext

export function isRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  return Boolean(typeof navigator.mediaDevices?.getUserMedia === 'function' && Ctor)
}

function downsample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return input
  const ratio = fromRate / TARGET_RATE
  const length = Math.floor(input.length / ratio)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    // average the samples that fall into this output sample
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out[i] = end > start ? sum / (end - start) : 0
  }
  return out
}

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, TARGET_RATE, true)
  view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export class WavRecorder {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private chunks: Float32Array[] = []
  private startedAt = 0
  private lastSoundAt = 0
  private heardSpeech = false
  private stopped = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private options: RecorderOptions) {}

  /** Asks for the microphone and starts recording. Call from a tap. */
  async start(): Promise<void> {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
    this.context = new Ctor()
    // iOS starts the context suspended until a user gesture resumes it.
    if (this.context.state === 'suspended') await this.context.resume()
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    this.source = this.context.createMediaStreamSource(this.stream)
    this.processor = this.context.createScriptProcessor(4096, 1, 1)
    this.startedAt = performance.now()
    this.lastSoundAt = this.startedAt

    this.processor.onaudioprocess = (event) => {
      if (this.stopped) return
      const data = event.inputBuffer.getChannelData(0)
      this.chunks.push(new Float32Array(data))

      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
      const rms = Math.sqrt(sum / data.length)
      this.options.onLevel?.(Math.min(1, rms * 8))

      const now = performance.now()
      if (rms > 0.02) {
        this.lastSoundAt = now
        this.heardSpeech = true
      }
      const silenceMs = this.options.silenceMs ?? 0
      if (silenceMs > 0 && this.heardSpeech && now - this.lastSoundAt > silenceMs) {
        this.options.onAutoStop?.()
      }
    }

    this.source.connect(this.processor)
    // ScriptProcessor only runs when connected to the output; it writes silence.
    this.processor.connect(this.context.destination)
    this.timer = setTimeout(() => this.options.onAutoStop?.(), this.options.maxSeconds * 1000)
  }

  /** Stops recording and returns the WAV file. */
  async stop(): Promise<Recording> {
    this.stopped = true
    const rate = this.context?.sampleRate ?? TARGET_RATE
    this.cleanup()
    const total = this.chunks.reduce((n, c) => n + c.length, 0)
    const all = new Float32Array(total)
    let offset = 0
    for (const chunk of this.chunks) {
      all.set(chunk, offset)
      offset += chunk.length
    }
    this.chunks = []
    const samples = downsample(all, rate)
    return { wav: encodeWav(samples), seconds: samples.length / TARGET_RATE, heardSpeech: this.heardSpeech }
  }

  /** Stops without keeping the recording. */
  cancel() {
    this.stopped = true
    this.chunks = []
    this.cleanup()
  }

  private cleanup() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.processor) this.processor.onaudioprocess = null
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.context?.close().catch(() => undefined)
    this.processor = null
    this.source = null
    this.stream = null
    this.context = null
  }
}
