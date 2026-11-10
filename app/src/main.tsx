import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/baloo-2/700.css'
import './index.css'
import App from './App.tsx'
import { Demo } from './ui/Demo'

const demo = new URLSearchParams(location.search).get('demo');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {demo ? <Demo name={demo} /> : <App />}
  </StrictMode>,
)
