import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'sonner'
import { GoogleCallback } from './components/auth/GoogleCallback'
import { loadRecaptcha } from './services/recaptcha'

// Initialize optional reCAPTCHA script before React renders
loadRecaptcha();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster richColors position="top-center"/>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<App />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/auth/google-callback" element={<GoogleCallback />} />
        <Route path="/auth/facebook-callback" element={<GoogleCallback />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
