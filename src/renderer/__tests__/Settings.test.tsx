import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'
import { useSettingsStore } from '../stores/settingsStore'

describe('Settings', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useSettingsStore.getState().reset()
  })

  it('should render settings tabs', () => {
    render(<Settings />)
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Providers' })).toBeInTheDocument()
  })

  it('should render theme selector in Appearance tab', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    // Click on the Appearance tab
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))

    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('should change theme when clicking theme button', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))

    const darkButton = screen.getByRole('button', { name: 'dark' })
    await user.click(darkButton)

    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('should render max parallel agents selector in General tab', () => {
    render(<Settings />)
    expect(screen.getByLabelText(/max parallel agents/i)).toBeInTheDocument()
  })

  it('should change max parallel agents when selecting a different value', async () => {
    const user = userEvent.setup()
    render(<Settings />)

    const select = screen.getByLabelText(/max parallel agents/i)
    await user.selectOptions(select, '4')

    expect(useSettingsStore.getState().maxParallelAgents).toBe(4)
  })
})
