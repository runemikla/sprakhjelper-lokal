import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  isStatementQuestion,
  type ListeningQuestion,
} from '@/lib/lytteoving'

interface QuestionListProps {
  questions: ListeningQuestion[]
  editable?: boolean
  idPrefix?: string
  onChange?: (index: number, patch: Partial<ListeningQuestion>) => void
}

export function QuestionList({
  questions,
  editable = false,
  idPrefix = 'question',
  onChange,
}: QuestionListProps) {
  if (editable) {
    return (
      <ol className="space-y-4">
        {questions.map((item, index) => {
          const isStatement = isStatementQuestion(item)
          const fasitName = `${idPrefix}-fasit-${index}`
          return (
            <li
              key={index}
              className="space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-${index}`}>
                  {isStatement ? 'Påstand' : 'Spørsmål'} {index + 1}
                </Label>
                <Textarea
                  id={`${idPrefix}-${index}`}
                  value={item.question}
                  autosize
                  onChange={(event) =>
                    onChange?.(index, { question: event.target.value })
                  }
                />
              </div>
              {isStatement && (
                <fieldset className="border-0 p-0">
                  <legend className="mb-2 text-sm font-medium text-gray-700">
                    Fasit
                  </legend>
                  <div className="flex items-center gap-6">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
                      <input
                        type="radio"
                        name={fasitName}
                        checked={item.isTrue === true}
                        onChange={() => onChange?.(index, { isTrue: true })}
                        className="size-4 accent-gray-900"
                      />
                      Sant
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
                      <input
                        type="radio"
                        name={fasitName}
                        checked={item.isTrue === false}
                        onChange={() => onChange?.(index, { isTrue: false })}
                        className="size-4 accent-gray-900"
                      />
                      Usant
                    </label>
                  </div>
                </fieldset>
              )}
            </li>
          )
        })}
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
