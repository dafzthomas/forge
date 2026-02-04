/**
 * File Watcher Types
 *
 * Defines types for file watching and automation rules.
 */

export type WatchEventType = 'add' | 'change' | 'unlink'

export interface WatchRule {
  id: string
  projectId: string
  name: string
  pattern: string // Glob pattern (e.g., "src/**/*.ts")
  events: WatchEventType[]
  skillName?: string // Skill to trigger
  action?: 'notify' | 'skill' | 'custom'
  customCommand?: string
  enabled: boolean
  debounceMs: number // Default: 1000
}

export interface WatchEvent {
  type: WatchEventType
  path: string
  timestamp: Date
  ruleId: string
}

export interface WatchRuleRow {
  id: string
  project_id: string
  name: string
  pattern: string
  events: string // JSON array
  skill_name: string | null
  action: string
  custom_command: string | null
  enabled: number
  debounce_ms: number
}

export type CreateWatchRuleInput = Omit<WatchRule, 'id'>
export type UpdateWatchRuleInput = Partial<Omit<WatchRule, 'id' | 'projectId'>>
