interface AudioPlayerProps {
  src: string
  label?: string
}

export function AudioPlayer({ src, label = 'Lytt til teksten' }: AudioPlayerProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
      <audio
        key={src}
        controls
        preload="auto"
        src={src}
        className="w-full"
        aria-label={label}
      >
        Nettleseren din støtter ikke lydavspilling.
      </audio>
    </div>
  )
}
