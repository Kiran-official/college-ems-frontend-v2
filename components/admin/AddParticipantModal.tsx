'use client'

import { useState, useTransition, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormGroup } from '@/components/forms/FormGroup'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/forms/SearchInput'
import { searchStudentsForInviteAction } from '@/lib/actions/userActions'
import { registerParticipantAction } from '@/lib/actions/registrationActions'

interface AddParticipantModalProps {
    eventId: string
    eventType: 'individual' | 'team'
    isPaid?: boolean
    teams: { id: string; team_name: string; memberCount: number }[]
    teamSize?: number
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function AddParticipantModal({ eventId, eventType, isPaid, teams, teamSize, open, onClose, onSuccess }: AddParticipantModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([])
    const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name: string }>>([])
    
    // Team options
    const [teamOption, setTeamOption] = useState<'existing' | 'new'>('existing')
    const [selectedTeamId, setSelectedTeamId] = useState('')
    const [newTeamName, setNewTeamName] = useState('')
    const [markAsVerified, setMarkAsVerified] = useState(true)

    const [error, setError] = useState('')
    const [pendingSearch, startSearchTransition] = useTransition()
    const [pendingSubmit, startSubmitTransition] = useTransition()

    // Reset when opened
    useEffect(() => {
        if (open) {
            setSearchQuery('')
            setSearchResults([])
            setSelectedUsers([])
            setTeamOption('existing')
            setSelectedTeamId('')
            setNewTeamName('')
            setMarkAsVerified(true)
            setError('')
        }
    }, [open])

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([])
            return
        }

        const timer = setTimeout(() => {
            startSearchTransition(async () => {
                const results = await searchStudentsForInviteAction(searchQuery, '')
                setSearchResults(results)
            })
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    async function handleSubmit() {
        if (selectedUsers.length === 0) {
            setError('Please search and select at least one student.')
            return
        }

        if (eventType === 'team') {
            if (teamOption === 'existing' && !selectedTeamId) {
                setError('Please select an existing team.')
                return
            }
            if (teamOption === 'new' && !newTeamName.trim()) {
                setError('Please enter a name for the new team.')
                return
            }
        }

        setError('')
        startSubmitTransition(async () => {
            let currentTeamId = selectedTeamId
            let totalSuccess = true
            let finalError = ''

            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i]
                
                const inputContext = {
                    eventId,
                    userId: user.id,
                    isManual: true,
                    // If creating a new team, only pass teamName for the first user
                    // For subsequent users, pass the currentTeamId we got back
                    teamId: eventType === 'team' ? (currentTeamId || undefined) : undefined,
                    teamName: eventType === 'team' && teamOption === 'new' && !currentTeamId ? newTeamName.trim() : undefined,
                    paymentStatus: isPaid ? (markAsVerified ? 'verified' as const : 'pending' as const) : undefined,
                }

                const result = await registerParticipantAction(inputContext)

                if (result.success) {
                    if (result.teamId) currentTeamId = result.teamId
                } else {
                    totalSuccess = false
                    finalError = `User ${user.name}: ${result.error ?? 'Registration failed'}`
                    break // Stop if one fails to avoid messy partial states
                }
            }

            if (totalSuccess) {
                onClose()
                onSuccess()
            } else {
                setError(finalError)
            }
        })
    }

    // Filter out full teams
    const availableTeams = teams.filter(t => !teamSize || t.memberCount < teamSize)

    return (
        <Modal open={open} onClose={onClose} title="Add Participant (Manual Override)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <div className="form-error">{error}</div>}

                <FormGroup label="Search & Add Students">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {selectedUsers.map(user => (
                            <div 
                                key={user.id} 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 6, 
                                    background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent)', 
                                    padding: '4px 8px', borderRadius: '16px', fontSize: '12px'
                                }}
                            >
                                <span style={{ fontWeight: 500 }}>{user.name}</span>
                                <button 
                                    type="button"
                                    onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                                    style={{ color: 'var(--text-tertiary)', background: 'transparent', cursor: 'pointer', display: 'flex' }}
                                    className="hover:text-danger"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <SearchInput 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            placeholder={selectedUsers.length === 0 ? "Search by name or email..." : "Add another student..."} 
                        />
                        {pendingSearch && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 4 }}>Searching...</div>}
                        
                        {searchResults.length > 0 && (
                            <div style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                                borderRadius: 'var(--r-md)', marginTop: '4px', zIndex: 10,
                                maxHeight: '140px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}>
                                {searchResults.map(user => {
                                    const isAlreadySelected = selectedUsers.some(u => u.id === user.id)
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                if (!isAlreadySelected) {
                                                    setSelectedUsers(prev => [...prev, { id: user.id, name: user.name }])
                                                }
                                                setSearchQuery('')
                                                setSearchResults([])
                                            }}
                                            style={{ 
                                                display: 'block', width: '100%', textAlign: 'left', 
                                                padding: '8px 12px', fontSize: '13px', 
                                                borderBottom: '1px solid var(--border)', background: 'transparent',
                                                cursor: isAlreadySelected ? 'default' : 'pointer',
                                                opacity: isAlreadySelected ? 0.5 : 1
                                            }}
                                            className={isAlreadySelected ? '' : 'hover:bg-muted'}
                                            disabled={isAlreadySelected}
                                        >
                                            <div style={{ fontWeight: 600 }}>{user.name} {isAlreadySelected && '(Added)'}</div>
                                            <div style={{ color: 'var(--text-tertiary)' }}>{user.email}</div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </FormGroup>

                {eventType === 'team' && selectedUsers.length > 0 && (
                    <FormGroup label="Team Assignment">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                                <input 
                                    type="radio"
                                    checked={teamOption === 'existing'} 
                                    onChange={() => setTeamOption('existing')} 
                                />
                                Add to Existing Team
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                                <input 
                                    type="radio"
                                    checked={teamOption === 'new'} 
                                    onChange={() => setTeamOption('new')} 
                                />
                                Create New Team
                            </label>
                        </div>

                        {teamOption === 'existing' ? (
                            <select className="form-select" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
                                <option value="">Select Team...</option>
                                {availableTeams.map(t => (
                                    <option key={t.id} value={t.id}>{t.team_name} ({t.memberCount}{teamSize ? `/${teamSize}` : ''} members)</option>
                                ))}
                                {availableTeams.length === 0 && <option value="" disabled>No available teams (all full or none created)</option>}
                            </select>
                        ) : (
                            <input 
                                className="form-input" 
                                placeholder="Enter bold new team name" 
                                value={newTeamName} 
                                onChange={e => setNewTeamName(e.target.value)} 
                            />
                        )}
                    </FormGroup>
                )}

                {isPaid && selectedUsers.length > 0 && (
                    <FormGroup label="Payment Status">
                        <label className="flex items-center gap-2 text-sm cursor-pointer border border-border/50 p-3 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
                            <input 
                                type="checkbox"
                                checked={markAsVerified} 
                                onChange={e => setMarkAsVerified(e.target.checked)} 
                            />
                            <span className="font-medium">Mark as Verified (Paid)</span>
                        </label>
                        <p className="text-[11px] text-text-tertiary mt-2">
                            Check this if you have already received the registration fee manually. 
                            Otherwise, it will be marked as &quot;Pending&quot;.
                        </p>
                    </FormGroup>
                )}
            </div>

            <div className="modal-footer">
                <Button variant="ghost" onClick={onClose} disabled={pendingSubmit}>Cancel</Button>
                <Button onClick={handleSubmit} loading={pendingSubmit} disabled={selectedUsers.length === 0}>
                    Add {selectedUsers.length > 1 ? `${selectedUsers.length} Students` : 'Student'}
                </Button>
            </div>
        </Modal>
    )
}
