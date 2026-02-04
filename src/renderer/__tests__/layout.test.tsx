import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../components/Sidebar'
import { MainPanel } from '../components/MainPanel'
import { StatusBar } from '../components/StatusBar'

describe('Layout Components', () => {
  describe('Sidebar', () => {
    it('should render projects section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })

    it('should render skills section', () => {
      render(<Sidebar />)
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })
  })

  describe('MainPanel', () => {
    it('should render task input', () => {
      render(<MainPanel />)
      expect(screen.getByPlaceholderText(/ask forge/i)).toBeInTheDocument()
    })
  })

  describe('StatusBar', () => {
    it('should render status information', () => {
      render(<StatusBar />)
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })
  })
})
