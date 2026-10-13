import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from './components/ui/sonner'
import { AudioPlayerProvider } from './player/AudioPlayerProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <BrowserRouter>
          {/* AudioPlayerProvider sits above the router so podcast playback survives navigation */}
          <AudioPlayerProvider>
            <App />
          </AudioPlayerProvider>
        </BrowserRouter>
        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
