import { Textarea } from '@/components/ui/textarea'
import type { AnswerCheckResult, ListeningQuestion } from '@/lib/lytteoving'

interface StudentQuestionListProps {
  questions: ListeningQuestion[]
  answers: string[]
  results?: AnswerCheckResult[] | null
  disabled?: boolean
  idPrefix?: string
  onAnswerChange: (index: number, value: string) => void
}

export function StudentQuestionList({
  questions,
  answers,
  results = null,
  disabled = false,
  idPrefix = 'student-answer',
  onAnswerChange,
}: StudentQuestionListProps) {
  return (
    <ol className="space-y-4">
      {questions.map((item, index) => {
        const result = results?.[index]
        const resultClass = result
          ? result.isCorrect
            ? 'border-green-300 bg-green-50'
            : 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-white'

        return (
          <li
            key={`${index}-${item.question}`}
            className={`space-y-3 rounded-xl border px-4 py-3 ${resultClass}`}
          >
            <p className="font-medium text-gray-900">
              {index + 1}. {item.question}
            </p>
            <Textarea
              id={`${idPrefix}-${index}`}
              value={answers[index] ?? ''}
              disabled={disabled}
              autosize
              maxLength={500}
              placeholder="Skriv svaret ditt her..."
              aria-label={`Svar på spørsmål ${index + 1}`}
              onChange={(event) => onAnswerChange(index, event.target.value)}
            />
            {result && (
              <p
                className={`text-sm ${
                  result.isCorrect ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.feedback}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
