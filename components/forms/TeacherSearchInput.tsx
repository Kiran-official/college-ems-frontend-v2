'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { User } from '@/lib/types/db'

interface TeacherSearchInputProps {
    selectedTeachers: Array<{ id: string; name: string }>
    onChange: (teachers: Array<{ id: string; name: string }>) => void
    lockedIds?: string[] // IDs that cannot be removed
    placeholder?: string
}

export function TeacherSearchInput({
    selectedTeachers,
    onChange,
    lockedIds = [],
    placeholder = 'Search teachers by name…',
}: TeacherSearchInputProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Array<{ id: string; name: string; email: string }>>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout>(undefined)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handleSearch(val: string) {
        setQuery(val)
        clearTimeout(debounceRef.current)

        if (val.trim().length < 2) {
            setResults([])
            setShowDropdown(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('role', 'teacher')
                .eq('is_active', true)
                .ilike('name', `%${val.trim()}%`)
                .limit(10)
            const selected = new Set(selectedTeachers.map(t => t.id))
            setResults(((data ?? []) as Array<{ id: string; name: string; email: string }>).filter(t => !selected.has(t.id)))
            setShowDropdown(true)
        }, 300)
    }

    function addTeacher(t: { id: string; name: string; email: string }) {
        onChange([...selectedTeachers, { id: t.id, name: t.name }])
        setQuery('')
        setResults([])
        setShowDropdown(false)
    }

    function removeTeacher(id: string) {
        if (lockedIds.includes(id)) return
        onChange(selectedTeachers.filter(t => t.id !== id))
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            {/* Selected tags */}
            {selectedTeachers.length > 0 && (
                <div className="faculty-pills" style={{ marginBottom: 8 }}>
                    {selectedTeachers.map(t => (
                        <span key={t.id} className="faculty-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {t.name}
                            {!lockedIds.includes(t.id) && (
                                <button
                                    type="button"
                                    onClick={() => removeTeacher(t.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}
                                    aria-label={`Remove ${t.name}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Search input */}
            <input
                className="form-input"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={placeholder}
            />

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--r-md)', marginTop: 4, maxHeight: 200, overflowY: 'auto',
                    boxShadow: 'var(--shadow-glass)',
                }}>
                    {results.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => addTeacher(t)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '10px 14px', border: 'none', background: 'none',
                                color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--accent-dim)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                        >
                            <div style={{ fontWeight: 500 }}>{t.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.email}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
