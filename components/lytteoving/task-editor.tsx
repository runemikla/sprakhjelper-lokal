'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AudioPlayer } from '@/components/lytteoving/audio-player'
import { QuestionList } from '@/components/lytteoving/question-list'
import type { ListeningQuestion } from '@/lib/lytteoving'

const MAX_CHARS = 1000
const QUESTION_COUNTS = [3, 5]

export interface DraftListeningTask {
  id: string
  text: string
  questionCount: number
  originalText: string
  questions: ListeningQuestion[]
  audioBase64: string | null
  audioMimeType: string
  audioUrl: string | null
  isGenerating: boolean
}

interface TaskEditorProps {
  index: number
  task: DraftListeningTask
  canRemove: boolean
  isLocked: boolean
  error?: string | null
  onTextChange: (value: string) => void
  onQuestionCountChange: (value: number) => void
  onQuestionChange: (questionIndex: number, value: string) => void
  onGenerate: () => void
  onRemove: () => void
}

export function TaskEditor({
  index,
  task,
  canRemove,
  isLocked,
  error = null,
  onTextChange,
  onQuestionCountChange,
  onQuestionChange,
  onGenerate,
  onRemove,
}: TaskEditorProps) {
  const canGenerate = task.text.trim().length > 0 && !task.isGenerating && !isLocked
  const taskNumber = index + 1

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Oppgave {taskNumber}
        </h3>
        {canRemove && !isLocked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={task.isGenerating}
          >
            <Trash2 className="h-4 w-4" />
            Fjern
          </Button>
        )}
      </div>

      <div>
        <Label
          htmlFor={`question-count-${task.id}`}
          className="text-lg font-semibold"
        >
          Hvor mange spørsmål vil du ha?
        </Label>
        <Select
          value={String(task.questionCount)}
          onValueChange={(value) => onQuestionCountChange(Number(value))}
          disabled={task.isGenerating || isLocked}
        >
          <SelectTrigger id={`question-count-${task.id}`}>
            <SelectValue placeholder="Velg antall spørsmål" />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_COUNTS.map((count) => (
              <SelectItem key={count} value={String(count)}>
                {count} spørsmål
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={`listening-text-${task.id}`} className="text-lg font-semibold">
          Lim inn teksten din her:
        </Label>
        <div className="relative">
          <Textarea
            id={`listening-text-${task.id}`}
            value={task.text}
            maxLength={MAX_CHARS}
            onChange={(event) => {
              if (event.target.value.length <= MAX_CHARS) {
                onTextChange(event.target.value)
              }
            }}
            placeholder="Skriv eller lim inn teksten din her..."
            className="min-h-[200px] pb-8"
            disabled={task.isGenerating || isLocked}
          />
          <span
            className={`absolute bottom-2 right-3 text-xs tabular-nums ${
              task.text.length >= MAX_CHARS
                ? 'text-red-500 font-semibold'
                : task.text.length >= MAX_CHARS - 100
                  ? 'text-amber-500'
                  : 'text-gray-400'
            }`}
          >
            {task.text.length} / {MAX_CHARS}
          </span>
        </div>
      </div>

      {!isLocked && (
        <Button
          type="button"
          className="w-full"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          {task.isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
          {task.isGenerating ? 'Genererer oppgave...' : 'Generer oppgave'}
        </Button>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {task.questions.length > 0 && (
        <div className="space-y-6 border-t border-gray-200 pt-4">
          {task.audioUrl && <AudioPlayer src={task.audioUrl} />}

          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              Original tekst
            </h4>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-gray-800">
              {task.originalText}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-lg font-semibold text-gray-900">
              Spørsmål
            </h4>
            <QuestionList
              questions={task.questions}
              editable={!isLocked}
              idPrefix={`task-${task.id}-question`}
              onChange={onQuestionChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
