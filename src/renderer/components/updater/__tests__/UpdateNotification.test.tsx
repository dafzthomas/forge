import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpdateNotification } from '../UpdateNotification'

describe('UpdateNotification', () => {
  let mockInvoke: ReturnType<typeof vi.fn>
  let mockOn: ReturnType<typeof vi.fn>
  let mockOff: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockInvoke = vi.fn()
    mockOn = vi.fn()
    mockOff = vi.fn()

    // Mock window.forge
    Object.defineProperty(window, 'forge', {
      writable: true,
      value: {
        invoke: mockInvoke,
        on: mockOn,
        off: mockOff,
      },
    })
  })

  it('should not render when no status is available', async () => {
    mockInvoke.mockResolvedValue({
      available: false,
      downloading: false,
      downloaded: false,
    })

    const { container } = render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))
    expect(container.firstChild).toBeNull()
  })

  it('should render update available notification', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      releaseNotes: 'New features',
      downloading: false,
      downloaded: false,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    expect(screen.getByText('Update Available')).toBeInTheDocument()
    expect(screen.getByText('Version 1.2.0 is ready to download')).toBeInTheDocument()
    expect(screen.getByText('New features')).toBeInTheDocument()
  })

  it('should render downloading state', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      downloading: true,
      downloadProgress: 50,
      downloaded: false,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    expect(screen.getByText('Downloading Update...')).toBeInTheDocument()
    expect(screen.getByText('50% complete')).toBeInTheDocument()
  })

  it('should render downloaded state', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      downloading: false,
      downloadProgress: 100,
      downloaded: true,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    expect(screen.getByText('Update Ready')).toBeInTheDocument()
    expect(screen.getByText('Restart the app to install version 1.2.0')).toBeInTheDocument()
  })

  it('should render error state', async () => {
    mockInvoke.mockResolvedValue({
      available: false,
      downloading: false,
      downloaded: false,
      error: 'Network error',
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    expect(screen.getByText('Update Error')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('should handle download button click', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      downloading: false,
      downloaded: false,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    const downloadButton = screen.getByText('Download')
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('updater:download')
    })
  })

  it('should handle install button click', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      downloading: false,
      downloaded: true,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    const installButton = screen.getByText('Restart Now')
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('updater:install')
    })
  })

  it('should handle retry button click on error', async () => {
    mockInvoke.mockResolvedValue({
      available: false,
      downloading: false,
      downloaded: false,
      error: 'Network error',
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('updater:check')
    })
  })

  it('should dismiss notification when Later button clicked', async () => {
    mockInvoke.mockResolvedValue({
      available: true,
      version: '1.2.0',
      downloading: false,
      downloaded: false,
    })

    const { container } = render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    const laterButton = screen.getByText('Later')
    fireEvent.click(laterButton)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should subscribe to status updates', async () => {
    mockInvoke.mockResolvedValue({
      available: false,
      downloading: false,
      downloaded: false,
    })

    render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    expect(mockOn).toHaveBeenCalledWith('updater:status', expect.any(Function))
  })

  it('should unsubscribe on unmount', async () => {
    mockInvoke.mockResolvedValue({
      available: false,
      downloading: false,
      downloaded: false,
    })

    const { unmount } = render(<UpdateNotification />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('updater:getStatus'))

    unmount()

    expect(mockOff).toHaveBeenCalledWith('updater:status', expect.any(Function))
  })
})
