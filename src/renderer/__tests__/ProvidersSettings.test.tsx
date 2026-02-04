import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProvidersSettings } from '../components/settings/ProvidersSettings'

describe('ProvidersSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should render empty state when no providers configured', () => {
      render(<ProvidersSettings />)
      expect(screen.getByText(/no providers configured/i)).toBeInTheDocument()
    })

    it('should render Add Provider button', () => {
      render(<ProvidersSettings />)
      expect(screen.getByRole('button', { name: /add provider/i })).toBeInTheDocument()
    })

    it('should render Providers heading', () => {
      render(<ProvidersSettings />)
      expect(screen.getByRole('heading', { name: /providers/i })).toBeInTheDocument()
    })
  })

  describe('Add Provider', () => {
    it('should open provider form when Add Provider button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/add new provider/i)).toBeInTheDocument()
    })

    it('should show provider type selection in form', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))

      expect(screen.getByLabelText(/provider type/i)).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /claude/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /bedrock/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /openai-compatible/i })).toBeInTheDocument()
    })

    it('should close form when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should add a new Claude provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))

      // Fill in form for Claude provider
      await user.type(screen.getByLabelText(/provider name/i), 'My Claude Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test-key')

      await user.click(screen.getByRole('button', { name: /save/i }))

      // Provider should appear in list
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('My Claude Provider')).toBeInTheDocument()
      expect(screen.queryByText(/no providers configured/i)).not.toBeInTheDocument()
    })

    it('should add a new Bedrock provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))

      await user.type(screen.getByLabelText(/provider name/i), 'My Bedrock Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'bedrock')
      await user.type(screen.getByLabelText(/region/i), 'us-east-1')
      await user.selectOptions(screen.getByLabelText(/auth type/i), 'profile')
      await user.type(screen.getByLabelText(/profile name/i), 'default')

      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(screen.getByText('My Bedrock Provider')).toBeInTheDocument()
    })

    it('should add a new OpenAI-Compatible provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))

      await user.type(screen.getByLabelText(/provider name/i), 'My Local LLM')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'openai-compatible')
      await user.type(screen.getByLabelText(/base url/i), 'http://localhost:8080')
      await user.type(screen.getByLabelText(/default model/i), 'llama-3')

      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(screen.getByText('My Local LLM')).toBeInTheDocument()
    })
  })

  describe('Provider List', () => {
    it('should display provider cards with correct information', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider first
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Check provider card
      const card = screen.getByTestId('provider-card')
      expect(within(card).getByText('Test Provider')).toBeInTheDocument()
      expect(within(card).getByText(/claude/i)).toBeInTheDocument()
    })

    it('should show Edit button for each provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      const card = screen.getByTestId('provider-card')
      expect(within(card).getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('should show Test Connection button for each provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      const card = screen.getByTestId('provider-card')
      expect(within(card).getByRole('button', { name: /test connection/i })).toBeInTheDocument()
    })

    it('should show Remove button for each provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      const card = screen.getByTestId('provider-card')
      expect(within(card).getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })
  })

  describe('Edit Provider', () => {
    it('should open form with provider data when Edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider first
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Click edit
      const card = screen.getByTestId('provider-card')
      await user.click(within(card).getByRole('button', { name: /edit/i }))

      // Form should be open with data
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/edit provider/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/provider name/i)).toHaveValue('Test Provider')
    })

    it('should update provider when saving edits', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Original Name')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Edit the provider
      const card = screen.getByTestId('provider-card')
      await user.click(within(card).getByRole('button', { name: /edit/i }))

      const nameInput = screen.getByLabelText(/provider name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Check updated name
      expect(screen.getByText('Updated Name')).toBeInTheDocument()
      expect(screen.queryByText('Original Name')).not.toBeInTheDocument()
    })
  })

  describe('Test Connection', () => {
    it('should show loading state when testing connection', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Click test connection
      const card = screen.getByTestId('provider-card')
      await user.click(within(card).getByRole('button', { name: /test connection/i }))

      // Should show testing state
      expect(within(card).getByText(/testing/i)).toBeInTheDocument()
    })

    it('should show success result after testing', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Click test connection
      const card = screen.getByTestId('provider-card')
      await user.click(within(card).getByRole('button', { name: /test connection/i }))

      // Should show success result (mocked)
      await waitFor(() => {
        expect(within(card).getByText(/connected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Remove Provider', () => {
    it('should remove provider when Remove button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Provider To Remove')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Verify provider exists
      expect(screen.getByText('Provider To Remove')).toBeInTheDocument()

      // Remove provider
      const card = screen.getByTestId('provider-card')
      await user.click(within(card).getByRole('button', { name: /remove/i }))

      // Should be gone
      expect(screen.queryByText('Provider To Remove')).not.toBeInTheDocument()
      expect(screen.getByText(/no providers configured/i)).toBeInTheDocument()
    })
  })

  describe('Provider Enabled Toggle', () => {
    it('should toggle provider enabled state', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      // Add a provider
      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Toggle Provider')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      const card = screen.getByTestId('provider-card')
      const toggle = within(card).getByRole('switch')

      // Should be enabled by default
      expect(toggle).toBeChecked()

      // Toggle off
      await user.click(toggle)
      expect(toggle).not.toBeChecked()
    })
  })

  describe('Form Validation', () => {
    it('should require provider name', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Should show error
      expect(screen.getByText(/provider name is required/i)).toBeInTheDocument()
    })

    it('should require API key for Claude provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'claude')
      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(screen.getByText(/api key is required/i)).toBeInTheDocument()
    })

    it('should require base URL for OpenAI-Compatible provider', async () => {
      const user = userEvent.setup()
      render(<ProvidersSettings />)

      await user.click(screen.getByRole('button', { name: /add provider/i }))
      await user.type(screen.getByLabelText(/provider name/i), 'Test')
      await user.selectOptions(screen.getByLabelText(/provider type/i), 'openai-compatible')
      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(screen.getByText(/base url is required/i)).toBeInTheDocument()
    })
  })
})
