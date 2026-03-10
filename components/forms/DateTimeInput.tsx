'use client'

import { useState, useRef, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { Calendar } from 'lucide-react'

interface DateTimeInputProps {
    value: string // Expects YYYY-MM-DDTHH:mm
    onChange: (value: string) => void
    required?: boolean
    placeholder?: string
}

export function DateTimeInput({ value, onChange, required, placeholder }: DateTimeInputProps) {
    const [displayValue, setDisplayValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (value) {
            try {
                // value is yyyy-MM-ddTHH:mm
                const date = new Date(value)
                if (!isNaN(date.getTime())) {
                    setDisplayValue(format(date, 'dd/MM/yyyy HH:mm'))
                } else {
                    setDisplayValue('')
                }
            } catch (e) {
                setDisplayValue('')
            }
        } else {
            setDisplayValue('')
        }
    }, [value])

    const handleContainerClick = () => {
        if (inputRef.current) {
            try {
                // Modern browsers support showPicker()
                if ('showPicker' in HTMLInputElement.prototype) {
                    inputRef.current.showPicker();
                } else {
                    inputRef.current.click();
                }
            } catch (e) {
                inputRef.current.click();
            }
        }
    }

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value)
    }

    return (
        <div 
            onClick={handleContainerClick}
            style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
        >
            {/* Visual Input */}
            <div 
                className="form-input" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    position: 'relative',
                    zIndex: 1
                }}
            >
                <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ 
                    color: displayValue ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: '0.9375rem' 
                }}>
                    {displayValue || placeholder || 'DD/MM/YYYY --:--'}
                </span>
            </div>

            {/* Hidden Native Input but still present for accessibility and as fallback */}
            <input
                ref={inputRef}
                type="datetime-local"
                value={value}
                onChange={handleNativeChange}
                required={required}
                aria-label={placeholder}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    zIndex: 0, // Behind the visual but still clickable via container
                    pointerEvents: 'none' // Clicks go to container
                }}
            />
        </div>
    )
}


