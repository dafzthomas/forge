/**
 * WatcherConfig Component
 *
 * UI for configuring file watch rules and automations.
 */

import { useState, useEffect } from 'react'
import type { WatchRule, WatchEventType } from '../../../main/watcher/types'
import { IPC_CHANNELS } from '../../../shared/ipc-types'

interface WatcherConfigProps {
  projectId: string
}

interface NewRuleForm {
  name: string
  pattern: string
  events: WatchEventType[]
  action: 'notify' | 'skill' | 'custom'
  skillName?: string
  customCommand?: string
  debounceMs: number
}

const defaultForm: NewRuleForm = {
  name: '',
  pattern: '',
  events: [],
  action: 'notify',
  debounceMs: 1000,
}

export function WatcherConfig({ projectId }: WatcherConfigProps) {
  const [rules, setRules] = useState<WatchRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<WatchRule | null>(null)
  const [formData, setFormData] = useState<NewRuleForm>(defaultForm)
  const [activeWatchers, setActiveWatchers] = useState<string[]>([])

  // Load rules and active watchers
  useEffect(() => {
    loadRules()
    loadActiveWatchers()
  }, [projectId])

  const loadRules = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_LIST_RULES, projectId)

      if (result.success && result.data) {
        setRules(result.data as WatchRule[])
      } else {
        setError(result.error || 'Failed to load rules')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const loadActiveWatchers = async () => {
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_GET_ACTIVE)
      if (result.success && result.data) {
        setActiveWatchers(result.data as string[])
      }
    } catch (err) {
      console.error('Failed to load active watchers:', err)
    }
  }

  const handleStartWatching = async () => {
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_START, projectId)
      if (result.success) {
        await loadActiveWatchers()
      } else {
        setError(result.error || 'Failed to start watching')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleStopWatching = async () => {
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_STOP, projectId)
      if (result.success) {
        await loadActiveWatchers()
      } else {
        setError(result.error || 'Failed to stop watching')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleAddRule = async () => {
    if (!formData.name || !formData.pattern || formData.events.length === 0) {
      setError('Name, pattern, and at least one event are required')
      return
    }

    try {
      const input = {
        projectId,
        name: formData.name,
        pattern: formData.pattern,
        events: formData.events,
        action: formData.action,
        skillName: formData.skillName,
        customCommand: formData.customCommand,
        enabled: true,
        debounceMs: formData.debounceMs,
      }

      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_ADD_RULE, input)

      if (result.success) {
        setFormData(defaultForm)
        setShowForm(false)
        await loadRules()
      } else {
        setError(result.error || 'Failed to add rule')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleUpdateRule = async () => {
    if (!editingRule) return

    try {
      const updates = {
        name: formData.name,
        pattern: formData.pattern,
        events: formData.events,
        action: formData.action,
        skillName: formData.skillName,
        customCommand: formData.customCommand,
        debounceMs: formData.debounceMs,
      }

      const result = await window.forge.invoke(
        IPC_CHANNELS.WATCHER_UPDATE_RULE,
        editingRule.id,
        updates
      )

      if (result.success) {
        setFormData(defaultForm)
        setEditingRule(null)
        setShowForm(false)
        await loadRules()
      } else {
        setError(result.error || 'Failed to update rule')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleToggleEnabled = async (rule: WatchRule) => {
    try {
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_UPDATE_RULE, rule.id, {
        enabled: !rule.enabled,
      })

      if (result.success) {
        await loadRules()
      } else {
        setError(result.error || 'Failed to toggle rule')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return
    }

    try {
      const result = await window.forge.invoke(IPC_CHANNELS.WATCHER_REMOVE_RULE, ruleId)

      if (result.success) {
        await loadRules()
      } else {
        setError(result.error || 'Failed to delete rule')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleEditRule = (rule: WatchRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      pattern: rule.pattern,
      events: [...rule.events],
      action: rule.action || 'notify',
      skillName: rule.skillName,
      customCommand: rule.customCommand,
      debounceMs: rule.debounceMs,
    })
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setEditingRule(null)
    setFormData(defaultForm)
    setShowForm(false)
  }

  const toggleEvent = (event: WatchEventType) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const isWatching = activeWatchers.includes(projectId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading watch rules...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">File Watcher</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            Status:{' '}
            <span className={isWatching ? 'text-green-500' : 'text-gray-500'}>
              {isWatching ? 'Watching' : 'Stopped'}
            </span>
          </span>
          <button
            onClick={isWatching ? handleStopWatching : handleStartWatching}
            className={`px-4 py-2 rounded transition-colors ${
              isWatching
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isWatching ? 'Stop Watching' : 'Start Watching'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Rule'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded space-y-4">
          <h3 className="text-lg font-medium">
            {editingRule ? 'Edit Rule' : 'Add New Rule'}
          </h3>

          <div>
            <label htmlFor="rule-name" className="block text-sm font-medium text-gray-400 mb-2">
              Rule Name
            </label>
            <input
              id="rule-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
              placeholder="e.g., Watch TypeScript files"
            />
          </div>

          <div>
            <label htmlFor="rule-pattern" className="block text-sm font-medium text-gray-400 mb-2">
              File Pattern (glob)
            </label>
            <input
              id="rule-pattern"
              type="text"
              value={formData.pattern}
              onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
              placeholder="e.g., **/*.ts or src/**/*.{js,ts}"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Watch Events</label>
            <div className="flex gap-4">
              {(['add', 'change', 'unlink'] as WatchEventType[]).map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rule-action" className="block text-sm font-medium text-gray-400 mb-2">
              Action
            </label>
            <select
              id="rule-action"
              value={formData.action}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  action: e.target.value as 'notify' | 'skill' | 'custom',
                })
              }
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="notify">Notify Only</option>
              <option value="skill">Trigger Skill</option>
              <option value="custom">Custom Command</option>
            </select>
          </div>

          {formData.action === 'skill' && (
            <div>
              <label
                htmlFor="rule-skill"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Skill Name
              </label>
              <input
                id="rule-skill"
                type="text"
                value={formData.skillName || ''}
                onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                placeholder="e.g., format, lint"
              />
            </div>
          )}

          {formData.action === 'custom' && (
            <div>
              <label
                htmlFor="rule-command"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Custom Command
              </label>
              <input
                id="rule-command"
                type="text"
                value={formData.customCommand || ''}
                onChange={(e) => setFormData({ ...formData, customCommand: e.target.value })}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
                placeholder="e.g., npm run format {path}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{path}'}, {'{type}'}, {'{timestamp}'} as placeholders
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="rule-debounce"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Debounce (ms)
            </label>
            <input
              id="rule-debounce"
              type="number"
              min="0"
              step="100"
              value={formData.debounceMs}
              onChange={(e) => setFormData({ ...formData, debounceMs: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Delay before triggering action after file change
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={editingRule ? handleUpdateRule : handleAddRule}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 transition-colors"
            >
              {editingRule ? 'Update Rule' : 'Add Rule'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No watch rules configured. Add a rule to get started.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded border transition-colors ${
                rule.enabled
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-900 border-gray-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{rule.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      {rule.action || 'notify'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1">
                    <div>
                      <span className="text-gray-500">Pattern:</span>{' '}
                      <code className="text-blue-400 font-mono text-xs">{rule.pattern}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">Events:</span>{' '}
                      {rule.events.map((event) => (
                        <span
                          key={event}
                          className="inline-block px-2 py-0.5 mr-1 rounded bg-gray-700 text-gray-300 text-xs"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    {rule.skillName && (
                      <div>
                        <span className="text-gray-500">Skill:</span>{' '}
                        <code className="text-green-400">{rule.skillName}</code>
                      </div>
                    )}
                    {rule.customCommand && (
                      <div>
                        <span className="text-gray-500">Command:</span>{' '}
                        <code className="text-yellow-400 text-xs">{rule.customCommand}</code>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Debounce:</span> {rule.debounceMs}ms
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEnabled(rule)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      rule.enabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
