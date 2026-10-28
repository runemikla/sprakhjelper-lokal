export class TextToSpeechError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TextToSpeechError'
    this.status = status
  }
}
