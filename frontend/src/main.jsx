import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import axios from 'axios'
import './index.css'

// 1. Global API Configuration
axios.defaults.baseURL = import.meta.env.MODE === 'production' 
  ? 'https://esg-compliance-platform.onrender.com' 
  : 'http://localhost:5000';

// 2. --- AXIOS REQUEST INTERCEPTOR ---
// Automatically attaches the JWT token to every outgoing request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 3. --- AXIOS RESPONSE INTERCEPTOR ---
// Catches expired tokens or unauthorized access and kicks the user out
axios.interceptors.response.use(
  (response) => response, // If the response is good, just pass it through
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired or unauthorized. Redirecting to login...");
      localStorage.removeItem('token'); // Clear the dead token
      localStorage.removeItem('user');
      window.location.href = '/login'; // Force redirect to the login portal
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)