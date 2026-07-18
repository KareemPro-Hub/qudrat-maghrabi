import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/home.css'
import './styles/admin-light.css'
import './styles/student-light.css'
import './styles/parent-light.css'
import './styles/lesson-light.css'
import './styles/auth.css'
import './styles/info-pages.css'
import './styles/primary-buttons.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
