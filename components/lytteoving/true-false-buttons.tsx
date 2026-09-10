import { Button } from '@/components/ui/button'

interface TrueFalseButtonsProps {
  value: boolean | null
  disabled?: boolean
  name?: string
  onChange: (value: boolean) => void
}

export function TrueFalseButtons({
  value,
  disabled = false,
  name,
  onChange,
}: TrueFalseButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label={name}>
      <Button
        type="button"
        variant={value === true ? 'default' : 'outline'}
        className={
          value === true
            ? 'h-12 bg-green-600 text-white hover:bg-green-700'
            : 'h-12'
        }
        disabled={disabled}
        aria-pressed={value === true}
        onClick={() => onChange(true)}
      >
        ✅ Sant
      </Button>
      <Button
        type="button"
        variant={value === false ? 'default' : 'outline'}
        className={
          value === false
            ? 'h-12 bg-red-600 text-white hover:bg-red-700'
            : 'h-12'
        }
        disabled={disabled}
        aria-pressed={value === false}
        onClick={() => onChange(false)}
      >
        ❌ Usant
      </Button>
    </div>
  )
}
