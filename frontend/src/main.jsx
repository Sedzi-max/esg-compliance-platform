import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import axios from 'axios'
import './index.css'

// 1. Global API Configuration: Dynamically switch based on where the code is running
axios.defaults.baseURL = import.meta.env.MODE === 'production' 
  ? 'https://esg-compliance-platform.onrender.com' 
  : 'http://localhost:5000';

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