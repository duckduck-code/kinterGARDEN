import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './lib/useAuth.jsx'
import ClickSparkles from './components/ClickSparkles.jsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ClickSparkles />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
