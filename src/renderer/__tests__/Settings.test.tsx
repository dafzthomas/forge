import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'

describe('Settings', () => {
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
})
