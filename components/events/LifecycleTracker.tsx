'use client'

import { CalendarCheck, Lock, Loader2, Eye, CheckCircle2, Check } from 'lucide-react'

const STEPS = [
    { key: 'draft', label: 'Draft', icon: CalendarCheck },
    { key: 'open', label: 'Open', icon: CheckCircle2 },
    { key: 'closed', label: 'Closed', icon: Lock },
    { key: 'processing', label: 'Processing', icon: Loader2 },
    { key: 'published', label: 'Published', icon: Eye },
    { key: 'completed', label: 'Completed', icon: Check },
]

function getActiveStep(status: string, resultsPublished: boolean): number {
    if (status === 'draft') return 0
    if (status === 'open') return 1
    if (status === 'closed' && !resultsPublished) return 3
    if (status === 'closed' && resultsPublished) return 4
    if (status === 'completed') return 5
    return 0
}

interface LifecycleTrackerProps {
    status: string
    resultsPublished: boolean
}

export function LifecycleTracker({ status, resultsPublished }: LifecycleTrackerProps) {
    const active = getActiveStep(status, resultsPublished)

    return (
        <div className="lifecycle" style={{ width: '100%', display: 'flex', margin: '8px 0' }}>
            {STEPS.map((step, i) => {
                const isDone = i < active
                const isActive = i === active
                const StepIcon = step.icon

                return (
                    <div key={step.key} style={{ display: 'flex', flex: i === STEPS.length - 1 ? 0 : 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                        
                        {/* The Step Itself */}
                        <div className="lifecycle__step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, minWidth: 'clamp(40px, 12vw, 60px)' }}>
                            <div 
                                className={`lifecycle__circle ${isDone ? 'lifecycle__circle--done' : ''} ${isActive ? 'lifecycle__circle--active' : ''}`} 
                                style={{ 
                                    width: 'clamp(28px, 7vw, 36px)', 
                                    height: 'clamp(28px, 7vw, 36px)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                {isDone ? <Check size={14} /> : <StepIcon size={14} />}
                            </div>
                            <span 
                                className={`lifecycle__label ${isActive ? 'lifecycle__label--active' : ''}`} 
                                style={{ 
                                    textAlign: 'center', 
                                    fontSize: 'clamp(0.45rem, 1.8vw, 0.6875rem)', 
                                    whiteSpace: 'normal', 
                                    wordWrap: 'break-word', 
                                    lineBreak: 'auto',
                                    maxWidth: '100%', 
                                    lineHeight: 1.1 
                                }}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* The Connector (flexes to fill the explicit exact gaps between the steps) */}
                        {i < STEPS.length - 1 && (
                            <div 
                                className={`lifecycle__connector ${i < active ? 'lifecycle__connector--done' : ''}`} 
                                style={{ 
                                    flex: 1, 
                                    height: 2, 
                                    minWidth: 4, 
                                    margin: '0 2px',
                                    marginTop: 'clamp(13px, 3.5vw, 17px)' // Matches exactly to the half-height of the circle to perfectly center it
                                }} 
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
