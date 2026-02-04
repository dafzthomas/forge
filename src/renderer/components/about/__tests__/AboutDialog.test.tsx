import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AboutDialog } from '../AboutDialog'

// Mock window.electron
const mockInvoke = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Setup window.electron mock
  Object.defineProperty(window, 'electron', {
    value: {
      ipcRenderer: {
        invoke: mockInvoke,
      },
    },
    writable: true,
    configurable: true,
  })
})

describe('AboutDialog', () => {
  it('should not render when isOpen is false', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    const { container } = render(<AboutDialog isOpen={false} onClose={onClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    expect(screen.getByText('Forge')).toBeInTheDocument()
    expect(screen.getByText('AI Coding Assistant')).toBeInTheDocument()
  })

  it('should display version from Electron', async () => {
    mockInvoke.mockResolvedValue('1.2.3')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    // Initially shows 0.0.0
    expect(screen.getByText(/Version 0\.0\.0/)).toBeInTheDocument()

    // Wait for version to load
    await screen.findByText(/Version 1\.2\.3/)
    expect(screen.getByText(/Version 1\.2\.3/)).toBeInTheDocument()
    expect(mockInvoke).toHaveBeenCalledWith('app:getVersion')
  })

  it('should call onClose when close button is clicked', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when clicking outside dialog', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    const { container } = render(<AboutDialog isOpen={true} onClose={onClose} />)

    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose when clicking inside dialog', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    const dialog = screen.getByText('Forge').closest('div')
    if (dialog) {
      fireEvent.click(dialog)
    }

    expect(onClose).not.toHaveBeenCalled()
  })

  it('should render GitHub link', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    const githubLink = screen.getByText('GitHub')
    expect(githubLink).toBeInTheDocument()
    expect(githubLink.closest('a')).toHaveAttribute(
      'href',
      'https://github.com/dafzthomas/forge'
    )
    expect(githubLink.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('should render Report Issue link', () => {
    mockInvoke.mockResolvedValue('0.1.0')
    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    const issueLink = screen.getByText('Report Issue')
    expect(issueLink).toBeInTheDocument()
    expect(issueLink.closest('a')).toHaveAttribute(
      'href',
      'https://github.com/dafzthomas/forge/issues'
    )
    expect(issueLink.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('should handle missing electron object gracefully', () => {
    // Remove electron mock
    Object.defineProperty(window, 'electron', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    // Should render with default version
    expect(screen.getByText(/Version 0\.0\.0/)).toBeInTheDocument()
  })

  it('should handle version fetch error gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to get version'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const onClose = vi.fn()
    render(<AboutDialog isOpen={true} onClose={onClose} />)

    // Should render with default version
    expect(screen.getByText(/Version 0\.0\.0/)).toBeInTheDocument()

    // Wait a bit for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should have logged error
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
