import { StrictMode } from 'react'
import { analytics } from '@heycatch/sdk'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "leaflet/dist/leaflet.css";


analytics.init({
  projectKey: 'hck_pk_nxUzJpjxRuwfB7hDx-8RfmHFyN2h2ME3',
  install: {
    framework: 'vite-react',
    frameworkVersion: '7',
    agent: 'other',
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
