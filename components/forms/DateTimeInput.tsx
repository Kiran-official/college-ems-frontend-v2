'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, setHours, setMinutes, getHours, getMinutes } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

interface DateTimeInputProps {
    value: string // Expects YYYY-MM-DDTHH:mm
    onChange: (value: string) => void
    required?: boolean
    placeholder?: string
    min?: string
    max?: string
}

type PickerView = 'calendar' | 'time'

export function DateTimeInput({ value, onChange, required, placeholder, min, max }: DateTimeInputProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState<PickerView>('calendar')
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [hours, setHoursState] = useState(9)
    const [minutes, setMinutesState] = useState(0)
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM')
    const containerRef = useRef<HTMLDivElement>(null)
    const [dropUp, setDropUp] = useState(false)

    // Parse value into state
    useEffect(() => {
        if (value) {
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
                setSelectedDate(date)
                setCurrentMonth(startOfMonth(date))
                let h = getHours(date)
                const m = getMinutes(date)
                setPeriod(h >= 12 ? 'PM' : 'AM')
                if (h === 0) h = 12
                else if (h > 12) h -= 12
                setHoursState(h)
                setMinutesState(m)
            }
        }
    }, [value])

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Calculate drop direction
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            setDropUp(spaceBelow < 420)
        }
    }, [isOpen])

    const emitValue = useCallback((date: Date, h: number, m: number, p: 'AM' | 'PM') => {
        let hours24 = h
        if (p === 'AM' && h === 12) hours24 = 0
        else if (p === 'PM' && h !== 12) hours24 = h + 12

        const finalDate = setMinutes(setHours(date, hours24), m)
        const iso = format(finalDate, "yyyy-MM-dd'T'HH:mm")
        onChange(iso)
    }, [onChange])

    function handleDateClick(day: Date) {
        setSelectedDate(day)
        emitValue(day, hours, minutes, period)
        // Auto-switch to time view after picking a date
        setView('time')
    }

    function handleTimeChange(h: number, m: number, p: 'AM' | 'PM') {
        setHoursState(h)
        setMinutesState(m)
        setPeriod(p)
        if (selectedDate) {
            emitValue(selectedDate, h, m, p)
        }
    }

    function handleDone() {
        setIsOpen(false)
        setView('calendar')
    }

    function handleClear() {
        setSelectedDate(null)
        setHoursState(9)
        setMinutesState(0)
        setPeriod('AM')
        onChange('')
        setIsOpen(false)
        setView('calendar')
    }

    // Calendar grid generation
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const calendarDays: Date[] = []
    let day = calStart
    while (day <= calEnd) {
        calendarDays.push(day)
        day = addDays(day, 1)
    }

    const displayValue = selectedDate
        ? format(selectedDate, 'dd/MM/yyyy') + ` ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
        : ''

    const minDate = min ? new Date(min) : undefined
    const maxDate = max ? new Date(max) : undefined

    function isDayDisabled(d: Date) {
        if (minDate) {
            const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
            if (d < minDay) return true
        }
        if (maxDate) {
            const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
            if (d > maxDay) return true
        }
        return false
    }

    return (
        <div ref={containerRef} className="datetime-picker" data-open={isOpen}>
            {/* Hidden input for form validation */}
            {required && (
                <input
                    type="text"
                    value={value}
                    required
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                    tabIndex={-1}
                    onChange={() => {}}
                />
            )}

            {/* Trigger */}
            <div
                role="button"
                tabIndex={0}
                className="datetime-picker__trigger"
                onClick={() => { setIsOpen(!isOpen); setView('calendar') }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setIsOpen(!isOpen)
                        setView('calendar')
                    }
                }}
            >
                <Calendar size={16} className="datetime-picker__icon" />
                <span className={displayValue ? 'datetime-picker__value' : 'datetime-picker__placeholder'}>
                    {displayValue || placeholder || 'Select date & time'}
                </span>
                {displayValue && (
                    <button
                        type="button"
                        className="datetime-picker__clear"
                        onClick={(e) => { e.stopPropagation(); handleClear() }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className={`datetime-picker__dropdown ${dropUp ? 'datetime-picker__dropdown--up' : ''}`}>
                    {/* Tab switcher */}
                    <div className="datetime-picker__tabs">
                        <button
                            type="button"
                            className={`datetime-picker__tab ${view === 'calendar' ? 'datetime-picker__tab--active' : ''}`}
                            onClick={() => setView('calendar')}
                        >
                            <Calendar size={14} />
                            Date
                        </button>
                        <button
                            type="button"
                            className={`datetime-picker__tab ${view === 'time' ? 'datetime-picker__tab--active' : ''}`}
                            onClick={() => setView('time')}
                        >
                            <Clock size={14} />
                            Time
                        </button>
                    </div>

                    {view === 'calendar' ? (
                        <div className="datetime-picker__calendar">
                            {/* Month navigation */}
                            <div className="datetime-picker__month-nav">
                                <button
                                    type="button"
                                    className="datetime-picker__nav-btn"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="datetime-picker__month-label">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </span>
                                <button
                                    type="button"
                                    className="datetime-picker__nav-btn"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Weekday headers */}
                            <div className="datetime-picker__weekdays">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                    <div key={d} className="datetime-picker__weekday">{d}</div>
                                ))}
                            </div>

                            {/* Days grid */}
                            <div className="datetime-picker__days">
                                {calendarDays.map((d, i) => {
                                    const isCurrentMonth = isSameMonth(d, currentMonth)
                                    const isSelected = selectedDate ? isSameDay(d, selectedDate) : false
                                    const isTodayDate = isToday(d)
                                    const disabled = isDayDisabled(d)

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={disabled}
                                            className={[
                                                'datetime-picker__day',
                                                !isCurrentMonth && 'datetime-picker__day--other',
                                                isSelected && 'datetime-picker__day--selected',
                                                isTodayDate && !isSelected && 'datetime-picker__day--today',
                                                disabled && 'datetime-picker__day--disabled',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => !disabled && handleDateClick(d)}
                                        >
                                            {format(d, 'd')}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Today shortcut */}
                            <div className="datetime-picker__footer">
                                <button
                                    type="button"
                                    className="datetime-picker__today-btn"
                                    onClick={() => {
                                        const today = new Date()
                                        setCurrentMonth(startOfMonth(today))
                                        handleDateClick(today)
                                    }}
                                >
                                    Today
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="datetime-picker__time">
                            {/* Time Display */}
                            <div className="datetime-picker__time-display">
                                <span className="datetime-picker__time-value">
                                    {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
                                </span>
                                <div className="datetime-picker__period-toggle">
                                    <button
                                        type="button"
                                        className={`datetime-picker__period-btn ${period === 'AM' ? 'datetime-picker__period-btn--active' : ''}`}
                                        onClick={() => handleTimeChange(hours, minutes, 'AM')}
                                    >
                                        AM
                                    </button>
                                    <button
                                        type="button"
                                        className={`datetime-picker__period-btn ${period === 'PM' ? 'datetime-picker__period-btn--active' : ''}`}
                                        onClick={() => handleTimeChange(hours, minutes, 'PM')}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>

                            {/* Hours */}
                            <div className="datetime-picker__time-section">
                                <label className="datetime-picker__time-label">Hour</label>
                                <div className="datetime-picker__time-grid datetime-picker__time-grid--hours">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            className={`datetime-picker__time-cell ${hours === h ? 'datetime-picker__time-cell--active' : ''}`}
                                            onClick={() => handleTimeChange(h, minutes, period)}
                                        >
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Minutes */}
                            <div className="datetime-picker__time-section">
                                <label className="datetime-picker__time-label">Minute</label>
                                <div className="datetime-picker__time-grid datetime-picker__time-grid--minutes">
                                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={`datetime-picker__time-cell ${minutes === m ? 'datetime-picker__time-cell--active' : ''}`}
                                            onClick={() => handleTimeChange(hours, m, period)}
                                        >
                                            {String(m).padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Done button */}
                    <div className="datetime-picker__actions">
                        <button
                            type="button"
                            className="datetime-picker__clear-btn"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="datetime-picker__done-btn"
                            onClick={handleDone}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
