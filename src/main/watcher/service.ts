/**
 * File Watcher Service
 *
 * Manages file watching and triggers automations based on file changes.
 */

import chokidar, { FSWatcher } from 'chokidar'
import { randomUUID } from 'crypto'
import { getDatabase } from '../database'
import { getProjectService } from '../projects'
import { getTaskQueueService } from '../tasks'
import type {
  WatchRule,
  WatchRuleRow,
  WatchEvent,
  CreateWatchRuleInput,
  UpdateWatchRuleInput,
  WatchEventType,
} from './types'

interface WatcherInstance {
  watcher: FSWatcher
  rules: Map<string, WatchRule>
}

export class FileWatcherService {
  private watchers: Map<string, WatcherInstance> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private eventCallbacks: Set<(event: WatchEvent) => void> = new Set()

  constructor() {
    this.initDatabase()
  }

  /**
   * Initialize database tables
   */
  private initDatabase(): void {
    // Schema is already created in database/schema.ts
  }

  /**
   * Start watching a project
   */
  startWatching(projectId: string): void {
    if (this.watchers.has(projectId)) {
      console.log(`Already watching project ${projectId}`)
      return
    }

    const projectService = getProjectService()
    const project = projectService.getProject(projectId)
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Load rules for this project
    const rules = this.loadRules(projectId)
    const enabledRules = rules.filter((rule) => rule.enabled)

    if (enabledRules.length === 0) {
      console.log(`No enabled rules for project ${projectId}`)
      return
    }

    // Collect all patterns
    const patterns = enabledRules.map((rule) => rule.pattern)

    // Create watcher
    const watcher = chokidar.watch(patterns, {
      cwd: project.path,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      persistent: true,
    })

    // Create rule map
    const ruleMap = new Map<string, WatchRule>()
    enabledRules.forEach((rule) => ruleMap.set(rule.id, rule))

    // Register event handlers
    watcher.on('add', (path: string) => this.handleFileEvent('add', path, projectId, ruleMap))
    watcher.on('change', (path: string) =>
      this.handleFileEvent('change', path, projectId, ruleMap)
    )
    watcher.on('unlink', (path: string) =>
      this.handleFileEvent('unlink', path, projectId, ruleMap)
    )

    watcher.on('error', (error: Error) => {
      console.error(`Watcher error for project ${projectId}:`, error)
    })

    // Store watcher instance
    this.watchers.set(projectId, { watcher, rules: ruleMap })
    console.log(`Started watching project ${projectId} with ${enabledRules.length} rules`)
  }

  /**
   * Stop watching a project
   */
  async stopWatching(projectId: string): Promise<void> {
    const instance = this.watchers.get(projectId)
    if (!instance) {
      return
    }

    await instance.watcher.close()
    this.watchers.delete(projectId)

    // Clear any pending debounce timers
    const timerKeys = Array.from(this.debounceTimers.keys()).filter((key) =>
      key.startsWith(`${projectId}:`)
    )
    timerKeys.forEach((key) => {
      const timer = this.debounceTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.debounceTimers.delete(key)
      }
    })

    console.log(`Stopped watching project ${projectId}`)
  }

  /**
   * Handle file event
   */
  private handleFileEvent(
    type: WatchEventType,
    path: string,
    projectId: string,
    rules: Map<string, WatchRule>
  ): void {
    // Find matching rules
    const matchingRules = Array.from(rules.values()).filter((rule) =>
      rule.events.includes(type)
    )

    if (matchingRules.length === 0) {
      return
    }

    // Process each matching rule
    matchingRules.forEach((rule) => {
      const event: WatchEvent = {
        type,
        path,
        timestamp: new Date(),
        ruleId: rule.id,
      }

      // Debounce the event
      const debounceKey = `${projectId}:${rule.id}:${path}`
      this.debounce(debounceKey, () => this.processEvent(event, rule), rule.debounceMs)
    })
  }

  /**
   * Process a watch event
   */
  private async processEvent(event: WatchEvent, rule: WatchRule): Promise<void> {
    console.log(`Processing event: ${event.type} ${event.path} (rule: ${rule.name})`)

    // Notify subscribers
    this.eventCallbacks.forEach((callback) => callback(event))

    // Execute action
    try {
      if (!rule.action || rule.action === 'notify') {
        // Just notify (already done above)
      } else if (rule.action === 'skill' && rule.skillName) {
        await this.triggerSkill(rule.skillName, event, rule.projectId)
      } else if (rule.action === 'custom' && rule.customCommand) {
        await this.executeCustomCommand(rule.customCommand, event, rule.projectId)
      }
    } catch (error) {
      console.error(`Error processing event for rule ${rule.name}:`, error)
    }
  }

  /**
   * Trigger a skill
   */
  private async triggerSkill(
    skillName: string,
    event: WatchEvent,
    projectId: string
  ): Promise<void> {
    const taskQueueService = getTaskQueueService()

    // Create a task description that includes the event context
    const description = `File ${event.type}: ${event.path}`

    await taskQueueService.createTask({
      projectId,
      description,
      skillName,
      priority: 'normal',
    })

    console.log(`Triggered skill ${skillName} for ${event.path}`)
  }

  /**
   * Execute a custom command
   */
  private async executeCustomCommand(
    command: string,
    event: WatchEvent,
    projectId: string
  ): Promise<void> {
    // Shell-escape placeholder values to prevent command injection
    const escapedPath = this.shellEscape(event.path)
    const escapedType = this.shellEscape(event.type)
    const escapedTimestamp = this.shellEscape(event.timestamp.toISOString())

    const processedCommand = command
      .replace(/\{path\}/g, escapedPath)
      .replace(/\{type\}/g, escapedType)
      .replace(/\{timestamp\}/g, escapedTimestamp)

    // For now, just log it - actual execution would need shell tool
    console.log(`Would execute custom command: ${processedCommand}`)

    // TODO: Integrate with shell tool from agents/tools/shell.ts
    // Note: Actual execution should use execFile with proper shell handling
  }

  /**
   * Simple shell escape function
   * Wraps in single quotes and escapes existing single quotes
   */
  private shellEscape(str: string): string {
    return `'${str.replace(/'/g, "'\\''")}'`
  }

  /**
   * Debounce helper
   */
  private debounce(key: string, fn: () => void, ms: number): void {
    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      fn()
    }, ms)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Add a watch rule
   */
  async addRule(input: CreateWatchRuleInput): Promise<WatchRule> {
    const rule: WatchRule = {
      id: randomUUID(),
      ...input,
    }

    this.saveRule(rule)

    // If project is being watched, restart it to pick up the new rule
    if (this.watchers.has(rule.projectId)) {
      await this.stopWatching(rule.projectId)
      this.startWatching(rule.projectId)
    }

    return rule
  }

  /**
   * Update a watch rule
   */
  async updateRule(id: string, updates: UpdateWatchRuleInput): Promise<WatchRule | null> {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM watch_rules WHERE id = ?').get(id) as
      | WatchRuleRow
      | undefined

    if (!row) {
      return null
    }

    const rule = this.rowToRule(row)
    const updated = { ...rule, ...updates }

    this.saveRule(updated)

    // Restart watcher if project is being watched
    if (this.watchers.has(updated.projectId)) {
      await this.stopWatching(updated.projectId)
      this.startWatching(updated.projectId)
    }

    return updated
  }

  /**
   * Remove a watch rule
   */
  async removeRule(id: string): Promise<boolean> {
    const db = getDatabase()
    const row = db.prepare('SELECT project_id FROM watch_rules WHERE id = ?').get(id) as
      | { project_id: string }
      | undefined

    if (!row) {
      return false
    }

    db.prepare('DELETE FROM watch_rules WHERE id = ?').run(id)

    // Restart watcher if project is being watched
    if (this.watchers.has(row.project_id)) {
      await this.stopWatching(row.project_id)
      this.startWatching(row.project_id)
    }

    return true
  }

  /**
   * List rules for a project
   */
  listRules(projectId: string): WatchRule[] {
    return this.loadRules(projectId)
  }

  /**
   * Subscribe to watch events
   */
  subscribe(callback: (event: WatchEvent) => void): () => void {
    this.eventCallbacks.add(callback)
    return () => {
      this.eventCallbacks.delete(callback)
    }
  }

  /**
   * Save a rule to the database
   */
  private saveRule(rule: WatchRule): void {
    const db = getDatabase()
    const row: WatchRuleRow = this.ruleToRow(rule)

    db.prepare(
      `INSERT OR REPLACE INTO watch_rules
       (id, project_id, name, pattern, events, skill_name, action, custom_command, enabled, debounce_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.project_id,
      row.name,
      row.pattern,
      row.events,
      row.skill_name,
      row.action,
      row.custom_command,
      row.enabled,
      row.debounce_ms
    )
  }

  /**
   * Load rules from the database
   */
  private loadRules(projectId: string): WatchRule[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM watch_rules WHERE project_id = ?')
      .all(projectId) as WatchRuleRow[]

    return rows.map((row) => this.rowToRule(row))
  }

  /**
   * Convert rule to database row
   */
  private ruleToRow(rule: WatchRule): WatchRuleRow {
    return {
      id: rule.id,
      project_id: rule.projectId,
      name: rule.name,
      pattern: rule.pattern,
      events: JSON.stringify(rule.events),
      skill_name: rule.skillName ?? null,
      action: rule.action ?? 'notify',
      custom_command: rule.customCommand ?? null,
      enabled: rule.enabled ? 1 : 0,
      debounce_ms: rule.debounceMs,
    }
  }

  /**
   * Convert database row to rule
   */
  private rowToRule(row: WatchRuleRow): WatchRule {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      pattern: row.pattern,
      events: JSON.parse(row.events) as WatchEventType[],
      skillName: row.skill_name ?? undefined,
      action: row.action as 'notify' | 'skill' | 'custom',
      customCommand: row.custom_command ?? undefined,
      enabled: row.enabled === 1,
      debounceMs: row.debounce_ms,
    }
  }

  /**
   * Get all active watchers
   */
  getActiveWatchers(): string[] {
    return Array.from(this.watchers.keys())
  }
}

// Singleton instance
let instance: FileWatcherService | null = null

export function getFileWatcherService(): FileWatcherService {
  if (!instance) {
    instance = new FileWatcherService()
  }
  return instance
}
