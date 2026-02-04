import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../database'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = path.join(__dirname, 'test.db')

describe('Database', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  it('should initialize database', () => {
    const db = initDatabase(TEST_DB_PATH)
    expect(db).toBeDefined()
  })

  it('should create tables on init', () => {
    const db = initDatabase(TEST_DB_PATH)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
    const tableNames = tables.map((t: any) => t.name)
    expect(tableNames).toContain('projects')
    expect(tableNames).toContain('tasks')
    expect(tableNames).toContain('task_history')
  })
})
