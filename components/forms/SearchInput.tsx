'use client'

import { Search, X } from 'lucide-react'

interface SearchInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: SearchInputProps) {
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
                size={16}
                style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', pointerEvents: 'none',
                }}
            />
            <input
                className="form-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ paddingLeft: 38, paddingRight: value ? 36 : 16 }}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-tertiary)', padding: 2,
                    }}
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    )
}
