const API_BASE = '/api'

let isSignupMode = false

const authForm = document.getElementById('authForm')
const authTitle = document.getElementById('authTitle')
const authSubtitle = document.getElementById('authSubtitle')
const authSubmitBtn = document.getElementById('authSubmitBtn')
const switchModeBtn = document.getElementById('switchModeBtn')
const switchText = document.getElementById('switchText')
const errorMessage = document.getElementById('errorMessage')
const guestBtn = document.getElementById('guestBtn')

const signupFields = document.getElementById('signupFields')
const confirmPasswordField = document.getElementById('confirmPasswordField')

switchModeBtn.addEventListener('click', () => {
  isSignupMode = !isSignupMode
  updateAuthMode()
})

function updateAuthMode() {
  if (isSignupMode) {
    authTitle.textContent = 'Create an account'
    authSubtitle.textContent = 'Join the DALChat community!'
    authSubmitBtn.textContent = 'Sign Up'
    switchText.textContent = 'Already have an account?'
    switchModeBtn.textContent = 'Log In'
    signupFields.style.display = 'block'
    confirmPasswordField.style.display = 'block'
  } else {
    authTitle.textContent = 'Welcome back!'
    authSubtitle.textContent = "We're excited to see you again!"
    authSubmitBtn.textContent = 'Log In'
    switchText.textContent = 'Need an account?'
    switchModeBtn.textContent = 'Sign Up'
    signupFields.style.display = 'none'
    confirmPasswordField.style.display = 'none'
  }
  hideError()
}

function showError(message) {
  errorMessage.textContent = message
  errorMessage.style.display = 'block'
}

function hideError() {
  errorMessage.style.display = 'none'
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const displayName = document.getElementById('displayName').value.trim()
  const confirmPassword = document.getElementById('confirmPassword').value

  if (isSignupMode) {
    if (!displayName) {
      showError('Please enter a display name')
      return
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }
    
    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        showError(data.error || 'Signup failed')
        return
      }
      
      localStorage.setItem('dalchat_user', JSON.stringify(data.user))
      localStorage.setItem('dalchat_token', data.token)
      window.location.href = '/index.html'
    } catch (error) {
      showError('Network error. Please try again.')
    }
  } else {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        showError(data.error || 'Login failed')
        return
      }
      
      localStorage.setItem('dalchat_user', JSON.stringify(data.user))
      localStorage.setItem('dalchat_token', data.token)
      window.location.href = '/index.html'
    } catch (error) {
      showError('Network error. Please try again.')
    }
  }
})

guestBtn.addEventListener('click', () => {
  const guestUser = {
    id: `guest-${Date.now()}`,
    display_name: 'Guest',
    email: null,
    isGuest: true
  }
  localStorage.setItem('dalchat_user', JSON.stringify(guestUser))
  window.location.href = '/index.html'
})

if (localStorage.getItem('dalchat_user')) {
  window.location.href = '/index.html'
}
