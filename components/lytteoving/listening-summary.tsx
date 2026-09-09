'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { AnswerCheckResult, ListeningQuestion } from '@/lib/lytteoving'

export interface ListeningSummaryItem {
  taskLabel: string | null
  question: string
  answer: string
  isCorrect: boolean
}

interface ListeningSummaryProps {
  code: string
  items: ListeningSummaryItem[]
  teacherVersion: 1 | 2
  onBack: () => void
}

function buildSummaryItems(
  tasks: { position: number; questions: ListeningQuestion[] }[],
  answers: string[][],
  results: (AnswerCheckResult[] | null)[]
): ListeningSummaryItem[] {
  const hasMultipleTasks = tasks.length > 1

  return tasks.flatMap((task, taskIndex) =>
    task.questions.map((item, questionIndex) => {
      const result = results[taskIndex]?.[questionIndex]
      return {
        taskLabel: hasMultipleTasks ? `Oppgave ${taskIndex + 1}` : null,
        question: item.question,
        answer: answers[taskIndex]?.[questionIndex]?.trim() || '(tomt svar)',
        isCorrect: Boolean(result?.isCorrect),
      }
    })
  )
}

export { buildSummaryItems }

function PieChart({
  correctCount,
  totalCount,
}: {
  correctCount: number
  totalCount: number
}) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const correctPercentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0
  const wrongPercentage = totalCount > 0 ? 100 - correctPercentage : 0
  const correctStrokeDashoffset = circumference - (correctPercentage / 100) * circumference

  return (
    <div className="relative mx-auto h-32 w-32">
      <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={correctStrokeDashoffset}
          className="transition-all duration-500"
        />
        {wrongPercentage > 0 && correctPercentage < 100 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(wrongPercentage / 100) * circumference} ${circumference}`}
            className="transition-all duration-500"
            style={{
              transform: `rotate(${(correctPercentage / 100) * 360}deg)`,
              transformOrigin: '50% 50%',
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-700">
          {Math.round(correctPercentage)}%
        </span>
      </div>
    </div>
  )
}

export function ListeningSummary({
  code,
  items,
  teacherVersion,
  onBack,
}: ListeningSummaryProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const totalCount = items.length
  const correctCount = items.filter((item) => item.isCorrect).length
  const wrongCount = totalCount - correctCount
  const allCorrect = totalCount > 0 && wrongCount === 0
  const correctPercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const teacherImage = allCorrect
    ? `/images/riktig_${teacherVersion}.png?v3`
    : `/images/feil_${teacherVersion}.png?v3`

  async function downloadPDF() {
    if (items.length === 0) {
      toast.error('Ingen data å laste ned')
      return
    }

    setIsGeneratingPDF(true)

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - margin * 2
      let yPos = margin

      const addText = (
        text: string,
        fontSize: number,
        isBold = false,
        color: [number, number, number] = [0, 0, 0]
      ) => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        doc.setTextColor(color[0], color[1], color[2])
        const lines = doc.splitTextToSize(text, maxWidth)
        if (yPos + lines.length * fontSize * 0.35 > pageHeight - margin) {
          doc.addPage()
          yPos = margin
        }
        doc.text(lines, margin, yPos)
        yPos += lines.length * fontSize * 0.35 + 5
      }

      addText('Lytteøving - Sammendrag', 20, true, [59, 130, 246])
      addText(
        new Date().toLocaleDateString('no-NO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        10,
        false,
        [107, 114, 128]
      )
      addText(`Kode: ${code}`, 11, true)
      yPos += 6

      addText('Statistikk', 16, true, [31, 41, 55])
      addText(`Antall spørsmål: ${totalCount}`, 11)
      addText(`Antall riktige: ${correctCount}`, 11)
      addText(`Antall feil: ${wrongCount}`, 11)
      addText(`Nøyaktighet: ${correctPercentage}%`, 11, true, [22, 163, 74])
      yPos += 6

      addText('Spørsmål og svar', 16, true, [31, 41, 55])
      items.forEach((item, index) => {
        if (item.taskLabel && (index === 0 || items[index - 1]?.taskLabel !== item.taskLabel)) {
          addText(item.taskLabel, 13, true, [31, 41, 55])
        }
        addText(`${index + 1}. ${item.question}`, 11, true)
        addText(
          `Svar: ${item.answer}`,
          10,
          false,
          item.isCorrect ? [22, 163, 74] : [220, 38, 38]
        )
        yPos += 4
      })

      yPos = Math.min(yPos + 8, pageHeight - margin)
      addText('Fortsett å øve!', 10, false, [107, 114, 128])

      doc.save(`lytteoving_sammendrag_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF lastet ned!')
    } catch (error) {
      console.error('Error generating listening summary PDF:', error)
      toast.error('Kunne ikke generere PDF. Prøv igjen.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Card className="border-white/20 bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 pb-4 pt-6">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-gray-900">Lytteøving</h2>
          <p className="text-sm text-gray-600">
            Kode: <span className="font-mono font-semibold tracking-[0.2em]">{code}</span>
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Tilbake til oppgaver
        </Button>
      </div>

      <CardHeader>
        <h2 className="text-2xl font-semibold">Sammendrag</h2>
      </CardHeader>

      <CardContent>
        <div className="space-y-8">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Statistikk</h3>
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Antall spørsmål:</span>
                  <span className="text-sm font-semibold">{totalCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Antall riktige:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {correctCount} av {totalCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Antall feil:</span>
                  <span className="text-sm font-semibold text-red-600">
                    {wrongCount} av {totalCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Nøyaktighet:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {correctPercentage}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Resultat</h3>
              <div className="flex flex-col items-center rounded-lg border bg-gray-50 p-4">
                <div className="flex w-full items-center justify-center gap-4">
                  <PieChart correctCount={correctCount} totalCount={totalCount} />
                  <Image
                    src={teacherImage}
                    alt={allCorrect ? 'Lærer med tommel opp' : 'Tankefull lærer'}
                    width={128}
                    height={128}
                    className="object-contain"
                  />
                </div>
                <p className="mt-3 text-center text-sm text-gray-600">
                  {allCorrect
                    ? 'Flott jobbet! Alt var riktig.'
                    : correctPercentage >= 60
                      ? 'Bra arbeid! Øv litt mer på det som ble feil.'
                      : 'Fortsett å øve!'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Spørsmål og svar</h3>
            <ol className="space-y-4">
              {items.map((item, index) => (
                <li key={`${item.taskLabel ?? 'task'}-${index}`}>
                  {item.taskLabel &&
                    (index === 0 || items[index - 1]?.taskLabel !== item.taskLabel) && (
                      <h4 className="mb-2 text-base font-semibold text-gray-800">
                        {item.taskLabel}
                      </h4>
                    )}
                  <div
                    className={`space-y-2 rounded-xl border px-4 py-3 ${
                      item.isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {index + 1}. {item.question}
                    </p>
                    <p
                      className={`text-sm ${
                        item.isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {item.answer}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 border-t pt-8">
            <Button
              onClick={() => void downloadPDF()}
              disabled={isGeneratingPDF}
              className="w-full border border-gray-300 bg-white py-6 text-lg text-gray-900 hover:bg-gray-50"
            >
              {isGeneratingPDF ? 'Genererer PDF...' : 'Last ned sammendrag (PDF)'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
