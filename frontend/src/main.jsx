import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import axios from 'axios'
import './index.css'

// 1. Set the global base URL for all backend requests (Powered by your new .env file!)
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// 2. --- AXIOS INTERCEPTOR ---
// This intercepts every outgoing request and automatically attaches the JWT token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)