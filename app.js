// ---------- Global State ----------
let currentUser = null
let currentServer = null
let currentChannel = null
let members = {}
let pollInterval = null

// API base URL
const API_BASE = '/api'

// ---------- Auth (Guest) ----------
async function guestLogin(displayName = "Guest") {
  currentUser = { id: `guest-${Date.now()}`, display_name: displayName }
  members[currentUser.id] = displayName
  updateMembersUI()
  updateUserUI()
  await loadServers()
}

// ---------- Servers ----------
async function loadServers() {
  try {
    const response = await fetch(`${API_BASE}/data`)
    const servers = await response.json()
    
    const serverContainer = document.getElementById('compactServerList')
    if (!serverContainer) return
    serverContainer.innerHTML = ''

    Object.keys(servers).forEach(serverName => {
      const li = document.createElement('li')
      li.className = 'server-icon'
      li.setAttribute('role', 'button')
      li.setAttribute('tabindex', '0')
      li.setAttribute('title', serverName)
      li.dataset.serverId = serverName
      
      const initial = document.createElement('span')
      initial.className = 'server-initial'
      initial.textContent = serverName.charAt(0).toUpperCase()
      
      li.appendChild(initial)
      li.onclick = () => selectServer(serverName)
      serverContainer.appendChild(li)
    })
    
    // Select first server if available
    const firstServer = Object.keys(servers)[0]
    if (firstServer) {
      selectServer(firstServer)
    }
  } catch (error) {
    console.error('Error loading servers:', error)
  }
}

async function createServer(name) {
  if (!currentUser) {
    alert('Please login first')
    return
  }
  
  try {
    const response = await fetch(`${API_BASE}/server`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: name })
    })
    
    const data = await response.json()
    if (data.success) {
      await loadServers()
      selectServer(name)
    }
  } catch (error) {
    console.error('Error creating server:', error)
    alert('Failed to create server')
  }
}

// ---------- Channels ----------
function selectServer(serverName) {
  currentServer = serverName
  currentChannel = 'general'
  
  // Update UI
  const serverNameEl = document.getElementById('serverName')
  if (serverNameEl) serverNameEl.textContent = serverName
  
  const channelTitleEl = document.getElementById('channelTitle')
  if (channelTitleEl) channelTitleEl.textContent = `# ${currentChannel}`
  
  // Update active state
  document.querySelectorAll('.server-icon').forEach(icon => {
    icon.classList.remove('active')
    if (icon.dataset.serverId === serverName) {
      icon.classList.add('active')
    }
  })
  
  loadMessages()
}

// ---------- Messages ----------
async function loadMessages() {
  if (!currentServer) return
  
  try {
    const response = await fetch(`${API_BASE}/data`)
    const servers = await response.json()
    
    const messagesList = document.getElementById('messagesList')
    if (!messagesList) return
    messagesList.innerHTML = ''
    
    const serverData = servers[currentServer]
    if (serverData && serverData.messages) {
      serverData.messages.forEach(msg => appendMessage(msg))
    }
    
    // Start polling for new messages
    startPolling()
  } catch (error) {
    console.error('Error loading messages:', error)
  }
}

function appendMessage(msg) {
  const messagesList = document.getElementById('messagesList')
  if (!messagesList) return

  const li = document.createElement('li')
  li.className = 'message'
  li.setAttribute('role', 'article')
  
  const avatar = document.createElement('img')
  avatar.className = 'msg-avatar'
  avatar.src = 'https://via.placeholder.com/40'
  avatar.alt = 'avatar'
  
  const msgBody = document.createElement('div')
  msgBody.className = 'msg-body'
  
  const msgMeta = document.createElement('div')
  msgMeta.className = 'msg-meta'
  
  const msgAuthor = document.createElement('span')
  msgAuthor.className = 'msg-author'
  msgAuthor.textContent = msg.username
  
  const msgTime = document.createElement('span')
  msgTime.className = 'msg-time'
  msgTime.textContent = formatTime(msg.time)
  
  msgMeta.appendChild(msgAuthor)
  msgMeta.appendChild(msgTime)
  
  const msgText = document.createElement('div')
  msgText.className = 'msg-text'
  msgText.textContent = msg.text
  
  msgBody.appendChild(msgMeta)
  msgBody.appendChild(msgText)
  
  li.appendChild(avatar)
  li.appendChild(msgBody)
  
  messagesList.appendChild(li)
  
  // Scroll to bottom
  const messagesWrap = document.getElementById('messagesWrap')
  if (messagesWrap) {
    messagesWrap.scrollTop = messagesWrap.scrollHeight
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function sendMessage(text) {
  if (!currentUser || !currentServer || !text.trim()) return
  
  try {
    const response = await fetch(`${API_BASE}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server: currentServer,
        username: currentUser.display_name,
        text: text
      })
    })
    
    const data = await response.json()
    if (data.success) {
      await loadMessages()
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

// ---------- Polling for new messages ----------
function startPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
  
  pollInterval = setInterval(async () => {
    if (currentServer) {
      const response = await fetch(`${API_BASE}/data`)
      const servers = await response.json()
      const serverData = servers[currentServer]
      
      if (serverData && serverData.messages) {
        const messagesList = document.getElementById('messagesList')
        const currentCount = messagesList ? messagesList.children.length : 0
        
        if (serverData.messages.length > currentCount) {
          loadMessages()
        }
      }
    }
  }, 2000)
}

// ---------- Members UI ----------
function updateMembersUI() {
  const memberList = document.getElementById('memberList')
  if (!memberList) return
  memberList.innerHTML = ''
  
  Object.entries(members).forEach(([id, name]) => {
    const li = document.createElement('li')
    li.className = 'member-item'
    
    const avatar = document.createElement('img')
    avatar.className = 'member-avatar'
    avatar.src = 'https://via.placeholder.com/28'
    avatar.alt = 'avatar'
    
    const meta = document.createElement('div')
    meta.className = 'member-meta'
    
    const nameSpan = document.createElement('span')
    nameSpan.className = 'member-name'
    nameSpan.textContent = name
    
    const presenceSpan = document.createElement('span')
    presenceSpan.className = 'member-presence muted'
    presenceSpan.textContent = 'online'
    
    meta.appendChild(nameSpan)
    meta.appendChild(presenceSpan)
    
    li.appendChild(avatar)
    li.appendChild(meta)
    
    memberList.appendChild(li)
  })
  
  const memberCount = document.getElementById('memberCount')
  if (memberCount) {
    memberCount.textContent = Object.keys(members).length
  }
}

function updateUserUI() {
  const userName = document.getElementById('userName')
  if (userName && currentUser) {
    userName.textContent = currentUser.display_name
  }
}

// ---------- Event Listeners ----------

// Sign in button
document.getElementById('signInBtn')?.addEventListener('click', () => {
  const name = prompt('Enter your display name:', 'Guest')
  if (name) {
    guestLogin(name)
  }
})

// Create server button
document.getElementById('createServerBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('createServerModal')
  if (modal) {
    modal.classList.remove('hidden')
  }
})

// Create server form
document.getElementById('createServerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('newServerName')
  if (input && input.value.trim()) {
    await createServer(input.value.trim())
    input.value = ''
    const modal = document.getElementById('createServerModal')
    if (modal) modal.classList.add('hidden')
  }
})

// Modal close buttons
document.querySelectorAll('[data-action="close"], [data-action="cancel"]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal')
    if (modal) modal.classList.add('hidden')
  })
})

// Discover button
document.getElementById('discoverBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('discoverModal')
  if (modal) modal.classList.remove('hidden')
})

// Message form
document.getElementById('messageForm')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('messageInput')
  if (input && input.value.trim()) {
    await sendMessage(input.value.trim())
    input.value = ''
  }
})

// Members toggle
document.getElementById('membersToggleBtn')?.addEventListener('click', () => {
  const rightPanel = document.getElementById('rightPanel')
  if (rightPanel) {
    rightPanel.style.display = rightPanel.style.display === 'none' ? 'flex' : 'none'
  }
})

// ---------- Initial Load ----------
window.addEventListener('DOMContentLoaded', () => {
  guestLogin("Guest")
})
