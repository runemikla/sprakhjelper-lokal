import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ListeningQuestion } from '@/lib/lytteoving'

interface QuestionListProps {
  questions: ListeningQuestion[]
  editable?: boolean
  onChange?: (index: number, value: string) => void
}

export function QuestionList({
  questions,
  editable = false,
  onChange,
}: QuestionListProps) {
  if (editable) {
    return (
      <ol className="space-y-4">
        {questions.map((item, index) => (
          <li
            key={index}
            className="space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div className="space-y-1">
              <Label htmlFor={`question-${index}`}>Spørsmål {index + 1}</Label>
              <Textarea
                id={`question-${index}`}
                value={item.question}
                autosize
                onChange={(event) => onChange?.(index, event.target.value)}
              />
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ol className="space-y-4">
      {questions.map((item, index) => (
        <li
          key={`${index}-${item.question}`}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <p className="font-medium text-gray-900">
            {index + 1}. {item.question}
          </p>
        </li>
      ))}
    </ol>
  )
}
