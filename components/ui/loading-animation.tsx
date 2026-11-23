'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingAnimationProps {
  isVisible: boolean
}

const loadingSteps = [
  'Analyserer tekst...',
  'Deler opp teksten i setninger...',
  'Hjelper med forbedringer av språket...',
  'Skriver tilbakemeldinger på setningene...'
]

export function LoadingAnimation({ isVisible }: LoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0)
      setDots('')
      return
    }

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // Progress through steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % loadingSteps.length)
    }, 2000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(stepInterval)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <Card className="border-vlfk-lyseblaa bg-gradient-to-r from-vlfk-lyseblaa/15 to-vlfk-lyseblaa/25 dark:from-vlfk-ink/20 dark:to-vlfk-ink/20">
      <CardContent className="py-8">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Spinner Animation */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-vlfk-lyseblaa border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-indigo-400 rounded-full animate-spin animation-delay-75"></div>
          </div>
          
          {/* Current Step Text */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-vlfk-ink dark:text-vlfk-lyseblaa mb-2">
              Skrivehjelp arbeider
            </h3>
            <p className="text-vlfk-ink dark:text-vlfk-lyseblaa text-base font-medium">
              {loadingSteps[currentStep]}{dots}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}