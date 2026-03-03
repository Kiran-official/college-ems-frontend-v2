'use client'

import { CalendarCheck, Lock, Loader2, Eye, CheckCircle2, Check } from 'lucide-react'

const STEPS = [
    { key: 'open', label: 'Open', icon: CalendarCheck },
    { key: 'closed', label: 'Closed', icon: Lock },
    { key: 'processing', label: 'Processing', icon: Loader2 },
    { key: 'published', label: 'Published', icon: Eye },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
]

function getActiveStep(status: string, resultsPublished: boolean): number {
    if (status === 'open') return 0
    if (status === 'closed' && !resultsPublished) return 2
    if (status === 'closed' && resultsPublished) return 3
    if (status === 'completed') return 4
    return 0
}

interface LifecycleTrackerProps {
    status: string
    resultsPublished: boolean
}

export function LifecycleTracker({ status, resultsPublished }: LifecycleTrackerProps) {
    const active = getActiveStep(status, resultsPublished)

    return (
        <div className="lifecycle">
            {STEPS.map((step, i) => {
                const isDone = i < active
                const isActive = i === active
                const StepIcon = step.icon

                return (
                    <div key={step.key} style={{ display: 'contents' }}>
                        <div className="lifecycle__step">
                            <div className={`lifecycle__circle ${isDone ? 'lifecycle__circle--done' : ''} ${isActive ? 'lifecycle__circle--active' : ''}`}>
                                {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                            </div>
                            <span className={`lifecycle__label ${isActive ? 'lifecycle__label--active' : ''}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`lifecycle__connector ${i < active ? 'lifecycle__connector--done' : ''}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
