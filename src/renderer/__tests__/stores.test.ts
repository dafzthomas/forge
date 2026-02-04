import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '../stores/projectStore'
import { useSettingsStore } from '../stores/settingsStore'

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('should add a project', () => {
    const { addProject } = useProjectStore.getState()
    addProject({ id: '1', name: 'Test', path: '/test' })
    expect(useProjectStore.getState().projects).toHaveLength(1)
  })

  it('should set active project', () => {
    const { addProject, setActiveProject } = useProjectStore.getState()
    addProject({ id: '1', name: 'Test', path: '/test' })
    setActiveProject('1')
    expect(useProjectStore.getState().activeProjectId).toBe('1')
  })
})

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset()
  })

  it('should toggle theme', () => {
    const { setTheme } = useSettingsStore.getState()
    setTheme('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('should set default model', () => {
    const { setDefaultModel } = useSettingsStore.getState()
    setDefaultModel('claude-sonnet')
    expect(useSettingsStore.getState().defaultModel).toBe('claude-sonnet')
  })
})
