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
    teams: { id: string; team_name: string; memberCount: number }[]
    teamSize?: number
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function AddParticipantModal({ eventId, eventType, teams, teamSize, open, onClose, onSuccess }: AddParticipantModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([])
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)
    
    // Team options
    const [teamOption, setTeamOption] = useState<'existing' | 'new'>('existing')
    const [selectedTeamId, setSelectedTeamId] = useState('')
    const [newTeamName, setNewTeamName] = useState('')

    const [error, setError] = useState('')
    const [pendingSearch, startSearchTransition] = useTransition()
    const [pendingSubmit, startSubmitTransition] = useTransition()

    // Reset when opened
    useEffect(() => {
        if (open) {
            setSearchQuery('')
            setSearchResults([])
            setSelectedUser(null)
            setTeamOption('existing')
            setSelectedTeamId('')
            setNewTeamName('')
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
        if (!selectedUser) {
            setError('Please search and select a student.')
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
            const inputContext = {
                eventId,
                userId: selectedUser.id,
                isManual: true, // Bypass deadlines and self-checks
                teamId: eventType === 'team' && teamOption === 'existing' ? selectedTeamId : undefined,
                teamName: eventType === 'team' && teamOption === 'new' ? newTeamName.trim() : undefined,
            }

            const result = await registerParticipantAction(inputContext)

            if (result.success) {
                onClose()
                onSuccess()
            } else {
                setError(result.error ?? 'Failed to register participant.')
            }
        })
    }

    // Filter out full teams
    const availableTeams = teams.filter(t => !teamSize || t.memberCount < teamSize)

    return (
        <Modal open={open} onClose={onClose} title="Add Participant (Manual Override)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <div className="form-error">{error}</div>}

                <FormGroup label="Search Student">
                    {!selectedUser ? (
                        <div style={{ position: 'relative' }}>
                            <SearchInput 
                                value={searchQuery} 
                                onChange={setSearchQuery} 
                                placeholder="Search by name or email..." 
                            />
                            {pendingSearch && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 4 }}>Searching...</div>}
                            
                            {searchResults.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', top: '100%', left: 0, right: 0, 
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                                    borderRadius: 'var(--r-md)', marginTop: '4px', zIndex: 10,
                                    maxHeight: '160px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}>
                                    {searchResults.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUser({ id: user.id, name: user.name })
                                                setSearchQuery('')
                                                setSearchResults([])
                                            }}
                                            style={{ 
                                                display: 'block', width: '100%', textAlign: 'left', 
                                                padding: '8px 12px', fontSize: '13px', 
                                                borderBottom: '1px solid var(--border)', background: 'transparent',
                                                cursor: 'pointer'
                                            }}
                                            className="hover:bg-muted"
                                        >
                                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                                            <div style={{ color: 'var(--text-tertiary)' }}>{user.email}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--muted)', padding: '8px 12px', borderRadius: 'var(--r-md)' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedUser.name}</span>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Change</Button>
                        </div>
                    )}
                </FormGroup>

                {eventType === 'team' && selectedUser && (
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
            </div>

            <div className="modal-footer">
                <Button variant="ghost" onClick={onClose} disabled={pendingSubmit}>Cancel</Button>
                <Button onClick={handleSubmit} loading={pendingSubmit} disabled={!selectedUser}>
                    Add Participant
                </Button>
            </div>
        </Modal>
    )
}
