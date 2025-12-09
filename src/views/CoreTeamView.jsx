import React, { useState } from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { FlagsDropdown, FlagBadges, AVAILABLE_FLAGS } from '../components/common/FlagsDropdown'

export function CoreTeamView() {
  const {
    coreAssociates,
    setCoreAssociates,
    firebaseStatus
  } = useStaffing()

  const [viewMode, setViewMode] = useState('byLead')
  const [selectedLead, setSelectedLead] = useState('')
  const [newLead, setNewLead] = useState('')
  const [newName, setNewName] = useState('')
  const [newFlags, setNewFlags] = useState([])
  const [filterFlags, setFilterFlags] = useState([])
  const [sortBy, setSortBy] = useState('name')
  const [searchQuery, setSearchQuery] = useState('')

  const allLeads = Object.keys(coreAssociates)

  const getAllAssociates = () => {
    const all = []
    Object.entries(coreAssociates).forEach(([lead, associates]) => {
      associates.forEach((assoc, index) => {
        all.push({
          ...assoc,
          lead,
          leadIndex: index,
          flags: assoc.flags || []
        })
      })
    })
    return all
  }

  const getFilteredAssociates = () => {
    let associates = viewMode === 'all'
      ? getAllAssociates()
      : (coreAssociates[selectedLead || newLead] || []).map(a => ({
          ...a,
          flags: a.flags || []
        }))

    if (searchQuery.trim()) {
      associates = associates.filter(assoc =>
        assoc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterFlags.length > 0) {
      associates = associates.filter(assoc =>
        filterFlags.every(flag => (assoc.flags || []).includes(flag))
      )
    }

    return [...associates].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      const aHasFlag = (a.flags || []).includes(sortBy) ? 1 : 0
      const bHasFlag = (b.flags || []).includes(sortBy) ? 1 : 0
      return bHasFlag - aHasFlag
    })
  }

  const handleAddAssociate = (e) => {
    e.preventDefault()
    const currentLead = selectedLead || newLead
    if (currentLead && newName) {
      setCoreAssociates(prev => ({
        ...prev,
        [currentLead]: [...(prev[currentLead] || []), { name: newName, flags: newFlags }]
      }))
      setNewName('')
      setNewFlags([])
      if (newLead) {
        setSelectedLead(newLead)
        setNewLead('')
      }
    }
  }

  const handleRemoveCoreAssociate = (lead, index) => {
    setCoreAssociates(prev => ({
      ...prev,
      [lead]: prev[lead].filter((_, i) => i !== index)
    }))
  }

  const handleUpdateAssociateFlags = (lead, index, flags) => {
    setCoreAssociates(prev => ({
      ...prev,
      [lead]: prev[lead].map((assoc, i) =>
        i === index ? { ...assoc, flags } : assoc
      )
    }))
  }

  const handleDeleteLineLead = (lead) => {
    if (confirm(`Delete line lead "${lead}" and all associated core team members?`)) {
      setCoreAssociates(prev => {
        const updated = { ...prev }
        delete updated[lead]
        return updated
      })
      if (selectedLead === lead) {
        setSelectedLead('')
      }
    }
  }

  const filteredAssociates = getFilteredAssociates()

  return (
    <div className="setup-form">
      <div className="form-section">
        <h3>Manage Core Associates</h3>
        <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '12px' }}>
          Core associates are team members assigned to specific line leads.
        </p>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'byLead' ? 'active' : ''}`}
            onClick={() => setViewMode('byLead')}
          >
            By Line Lead
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Associates
          </button>
        </div>

        {/* Search */}
        {viewMode === 'all' && (
          <input
            type="text"
            className="search-box"
            placeholder="Search associates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}

        {/* By Lead View */}
        {viewMode === 'byLead' && (
          <>
            <div className="form-grid">
              <div className="form-group">
                <label>Select Existing Lead</label>
                <select
                  value={selectedLead}
                  onChange={(e) => {
                    setSelectedLead(e.target.value)
                    setNewLead('')
                  }}
                >
                  <option value="">-- Select Lead --</option>
                  {allLeads.map(lead => (
                    <option key={lead} value={lead}>{lead}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#6b7280' }}>OR</div>
              <div className="form-group">
                <label>New Lead Name</label>
                <input
                  type="text"
                  value={newLead}
                  onChange={(e) => {
                    setNewLead(e.target.value)
                    setSelectedLead('')
                  }}
                  placeholder="Enter new lead name"
                />
              </div>
            </div>

            {(selectedLead || newLead) && (
              <div style={{ marginTop: '20px' }}>
                <div className="lead-header">
                  <h4 className="lead-title">Core Associates for {selectedLead || newLead}</h4>
                  {selectedLead && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteLineLead(selectedLead)}
                    >
                      Delete Line Lead
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddAssociate}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Associate Name *</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Flags / Skills</label>
                      <FlagsDropdown flags={newFlags} onChange={setNewFlags} inForm={true} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-success">
                    + Add Core Associate
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* Filters */}
        {((viewMode === 'byLead' && (selectedLead || newLead) && (coreAssociates[selectedLead || newLead] || []).length > 0) ||
          (viewMode === 'all' && getAllAssociates().length > 0)) && (
          <div className="filter-controls">
            <div className="filter-row">
              <span className="filter-label">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              >
                <option value="name">Name</option>
                {AVAILABLE_FLAGS.map(flag => (
                  <option key={flag.id} value={flag.id}>{flag.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-row" style={{ marginTop: '8px' }}>
              <span className="filter-label">Filter by flags:</span>
              {AVAILABLE_FLAGS.map(flag => (
                <label key={flag.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterFlags.includes(flag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterFlags([...filterFlags, flag.id])
                      } else {
                        setFilterFlags(filterFlags.filter(f => f !== flag.id))
                      }
                    }}
                  />
                  {flag.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Associates List */}
        {viewMode === 'byLead' ? (
          (selectedLead || newLead) && (
            <div className="core-associates-list">
              {(coreAssociates[selectedLead || newLead] || []).length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
                  No core associates yet for this lead.
                </p>
              ) : filteredAssociates.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
                  No associates match the selected filters.
                </p>
              ) : (
                filteredAssociates.map((associate, idx) => {
                  const originalIndex = (coreAssociates[selectedLead || newLead] || [])
                    .findIndex(a => a.name === associate.name)
                  return (
                    <div key={idx} className="core-associate-item">
                      <div className="core-associate-info">
                        <div className="core-associate-name">{associate.name}</div>
                        <FlagBadges flags={associate.flags} />
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                        <FlagsDropdown
                          flags={associate.flags || []}
                          onChange={(flags) => handleUpdateAssociateFlags(selectedLead || newLead, originalIndex, flags)}
                        />
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleRemoveCoreAssociate(selectedLead || newLead, originalIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )
        ) : (
          <div>
            {allLeads.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                No line leads created yet.
              </p>
            ) : filteredAssociates.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                {searchQuery ? 'No associates match your search.' : 'No associates match the selected filters.'}
              </p>
            ) : (
              allLeads.map(lead => {
                const leadAssociates = filteredAssociates.filter(a => a.lead === lead)
                if (leadAssociates.length === 0) return null

                return (
                  <div key={lead} className="lead-section">
                    <div className="lead-header">
                      <h4 className="lead-title">{lead}</h4>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteLineLead(lead)}
                      >
                        Delete Lead
                      </button>
                    </div>
                    <div className="core-associates-list">
                      {leadAssociates.map((associate, idx) => (
                        <div key={idx} className="core-associate-item">
                          <div className="core-associate-info">
                            <div className="core-associate-name">{associate.name}</div>
                            <FlagBadges flags={associate.flags} />
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <FlagsDropdown
                              flags={associate.flags || []}
                              onChange={(flags) => handleUpdateAssociateFlags(associate.lead, associate.leadIndex, flags)}
                            />
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleRemoveCoreAssociate(associate.lead, associate.leadIndex)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Firebase Status */}
      <div className="firebase-status">
        <div className={`firebase-status-dot ${firebaseStatus}`} />
        <span>
          {firebaseStatus === 'connected' ? 'Cloud Connected' :
           firebaseStatus === 'disconnected' ? 'Cloud Disconnected' :
           'Offline Mode'}
        </span>
      </div>
    </div>
  )
}

export default CoreTeamView
