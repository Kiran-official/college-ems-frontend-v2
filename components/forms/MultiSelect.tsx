'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'

interface Option {
    id: string
    name: string
    [key: string]: any
}

interface MultiSelectProps {
    options: Option[]
    selectedIds: string[]
    onChange: (selected: Option[]) => void
    placeholder?: string
    labelKey?: string
    disabled?: boolean
}

export function MultiSelect({
    options,
    selectedIds,
    onChange,
    placeholder = 'Select options...',
    labelKey = 'name',
    disabled = false
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOptions = options.filter(opt => selectedIds.includes(opt.id))
    const filteredOptions = options.filter(opt =>
        opt[labelKey].toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOption = (option: Option) => {
        if (selectedIds.includes(option.id)) {
            onChange(selectedOptions.filter(opt => opt.id !== option.id))
        } else {
            onChange([...selectedOptions, option])
        }
    }

    const removeOption = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(selectedOptions.filter(opt => opt.id !== id))
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`form-input ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    minHeight: 42,
                    padding: '8px 12px',
                    paddingRight: 32,
                    alignItems: 'center',
                    background: 'var(--bg-input)',
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border-input)',
                    boxShadow: isOpen ? '0 0 0 2px rgba(0, 201, 255, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                }}
            >
                {selectedOptions.length === 0 ? (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{placeholder}</span>
                ) : (
                    selectedOptions.map(opt => (
                        <span
                            key={opt.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: 'rgba(0, 201, 255, 0.1)',
                                color: 'var(--accent)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: '1px solid rgba(0, 201, 255, 0.2)'
                            }}
                        >
                            {opt[labelKey]}
                            <X
                                size={12}
                                className="cursor-pointer hover:text-white"
                                onClick={(e) => removeOption(opt.id, e)}
                            />
                        </span>
                    ))
                )}
                <ChevronDown
                    size={16}
                    style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-tertiary)'
                    }}
                />
            </div>

            {isOpen && (
                <div
                    className="glass"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        maxHeight: 300,
                        overflowY: 'auto',
                        padding: 8,
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border-glass)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                    }}
                >
                    <div style={{ position: 'relative', marginBottom: 4 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            autoFocus
                            className="form-input"
                            style={{ paddingLeft: 32, height: 36, fontSize: '0.8125rem' }}
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = selectedIds.includes(opt.id)
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => toggleOption(opt)}
                                        className="hover:bg-accent-transparent"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            background: isSelected ? 'rgba(0, 201, 255, 0.05)' : 'transparent',
                                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                                            transition: 'all 0.1s ease'
                                        }}
                                    >
                                        <span>{opt[labelKey]}</span>
                                        {isSelected && <Check size={14} />}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
