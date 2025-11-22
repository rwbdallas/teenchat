// ---------- Global State ----------
let currentUser = null
let currentServer = null
let currentChannel = null
let servers = []
let pollInterval = null

// API base URL
const API_BASE = '/api'

// ---------- Auth Check ----------
function checkAuth() {
  const userStr = localStorage.getItem('dalchat_user')
  if (!userStr) {
    window.location.href = '/auth.html'
    return false
  }
  
  currentUser = JSON.parse(userStr)
  return true
}

// Logout function
function logout() {
  localStorage.removeItem('dalchat_user')
  localStorage.removeItem('dalchat_token')
  window.location.href = '/auth.html'
}

// ---------- Load Servers ----------
async function loadServers() {
  if (!currentUser) return
  
  try {
    const response = await fetch(`${API_BASE}/servers?userId=${currentUser.id}`)
    const data = await response.json()
    
    servers = data.servers || []
    
    const serverContainer = document.getElementById('compactServerList')
    if (!serverContainer) return
    serverContainer.innerHTML = ''

    servers.forEach(server => {
      const li = document.createElement('li')
      li.className = 'server-icon'
      li.setAttribute('role', 'button')
      li.setAttribute('tabindex', '0')
      li.setAttribute('title', server.name)
      li.dataset.serverId = server.id
      
      const initial = document.createElement('span')
      initial.className = 'server-initial'
      initial.textContent = server.name.charAt(0).toUpperCase()
      
      li.appendChild(initial)
      li.onclick = () => selectServer(server.id)
      serverContainer.appendChild(li)
    })
    
    // Select first server if available
    if (servers.length > 0) {
      selectServer(servers[0].id)
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
    const response = await fetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        userId: currentUser.id,
        userDisplayName: currentUser.display_name || currentUser.displayName
      })
    })
    
    const data = await response.json()
    if (data.success) {
      await loadServers()
    } else {
      alert(data.error || 'Failed to create server')
    }
  } catch (error) {
    console.error('Error creating server:', error)
    alert('Failed to create server')
  }
}

// ---------- Select Server & Channels ----------
function selectServer(serverId) {
  const server = servers.find(s => s.id === serverId)
  if (!server) return
  
  currentServer = server
  currentChannel = server.channels[0].id
  
  // Update UI
  const serverNameEl = document.getElementById('serverName')
  if (serverNameEl) serverNameEl.textContent = server.name
  
  // Update active state
  document.querySelectorAll('.server-icon').forEach(icon => {
    icon.classList.remove('active')
    if (icon.dataset.serverId === serverId) {
      icon.classList.add('active')
    }
  })
  
  loadChannels()
  loadMembers()
  selectChannel(currentChannel)
}

function loadChannels() {
  if (!currentServer) return
  
  const channelList = document.getElementById('channelList')
  if (!channelList) return
  channelList.innerHTML = ''
  
  currentServer.channels.forEach(channel => {
    const li = document.createElement('li')
    li.className = 'channel-item'
    li.setAttribute('role', 'button')
    li.setAttribute('tabindex', '0')
    li.dataset.channelId = channel.id
    li.textContent = `# ${channel.name}`
    li.onclick = () => selectChannel(channel.id)
    channelList.appendChild(li)
  })
}

function selectChannel(channelId) {
  currentChannel = channelId
  
  const channel = currentServer.channels.find(c => c.id === channelId)
  if (!channel) return
  
  const channelTitleEl = document.getElementById('channelTitle')
  if (channelTitleEl) channelTitleEl.textContent = `# ${channel.name}`
  
  // Update active state
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active')
    if (item.dataset.channelId === channelId) {
      item.classList.add('active')
    }
  })
  
  loadMessages()
}

async function createChannel(name) {
  if (!currentServer || !currentUser) return
  
  try {
    const response = await fetch(`${API_BASE}/servers/${currentServer.id}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId: currentUser.id })
    })
    
    const data = await response.json()
    if (data.success) {
      currentServer.channels.push(data.channel)
      loadChannels()
    } else {
      alert(data.error || 'Failed to create channel')
    }
  } catch (error) {
    console.error('Error creating channel:', error)
    alert('Failed to create channel')
  }
}

async function deleteChannel(channelId) {
  if (!currentServer || !currentUser || !confirm('Delete this channel?')) return
  
  try {
    const response = await fetch(`${API_BASE}/servers/${currentServer.id}/channels/${channelId}?userId=${currentUser.id}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    if (data.success) {
      currentServer.channels = currentServer.channels.filter(c => c.id !== channelId)
      loadChannels()
      if (currentChannel === channelId) {
        selectChannel('general')
      }
    } else {
      alert(data.error || 'Failed to delete channel')
    }
  } catch (error) {
    console.error('Error deleting channel:', error)
  }
}

// ---------- Messages ----------
async function loadMessages() {
  if (!currentServer || !currentChannel) return
  
  try {
    const response = await fetch(`${API_BASE}/servers/${currentServer.id}/messages/${currentChannel}`)
    const data = await response.json()
    
    const messagesList = document.getElementById('messagesList')
    if (!messagesList) return
    messagesList.innerHTML = ''
    
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => appendMessage(msg))
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
  
  // Add role badge
  const member = currentServer.members[msg.userId]
  if (member && member.role !== 'member') {
    const roleBadge = document.createElement('span')
    roleBadge.className = `role-badge role-${member.role}`
    roleBadge.textContent = member.role.toUpperCase()
    msgAuthor.appendChild(roleBadge)
  }
  
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
  if (!currentUser || !currentServer || !currentChannel || !text.trim()) return
  
  try {
    const response = await fetch(`${API_BASE}/servers/${currentServer.id}/messages/${currentChannel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        username: currentUser.display_name || currentUser.displayName || 'User',
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
    if (currentServer && currentChannel) {
      const response = await fetch(`${API_BASE}/servers/${currentServer.id}/messages/${currentChannel}`)
      const data = await response.json()
      
      const messagesList = document.getElementById('messagesList')
      const currentCount = messagesList ? messagesList.children.length : 0
      
      if (data.messages && data.messages.length > currentCount) {
        loadMessages()
      }
    }
  }, 2000)
}

// ---------- Members ----------
function loadMembers() {
  if (!currentServer) return
  
  const memberList = document.getElementById('memberList')
  if (!memberList) return
  memberList.innerHTML = ''
  
  Object.values(currentServer.members).forEach(member => {
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
    nameSpan.textContent = member.displayName
    
    // Add role badge
    if (member.role !== 'member') {
      const roleBadge = document.createElement('span')
      roleBadge.className = `role-badge-small role-${member.role}`
      roleBadge.textContent = member.role
      nameSpan.appendChild(roleBadge)
    }
    
    const presenceSpan = document.createElement('span')
    presenceSpan.className = 'member-presence muted'
    presenceSpan.textContent = 'online'
    
    meta.appendChild(nameSpan)
    meta.appendChild(presenceSpan)
    
    li.appendChild(avatar)
    li.appendChild(meta)
    
    // Right-click menu for role management (only for owner)
    if (currentServer.members[currentUser.id]?.role === 'owner' && member.userId !== currentUser.id) {
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        showRoleMenu(member, e.clientX, e.clientY)
      })
      li.style.cursor = 'context-menu'
    }
    
    memberList.appendChild(li)
  })
  
  const memberCount = document.getElementById('memberCount')
  if (memberCount) {
    memberCount.textContent = Object.keys(currentServer.members).length
  }
}

function showRoleMenu(member, x, y) {
  const existingMenu = document.querySelector('.role-context-menu')
  if (existingMenu) existingMenu.remove()
  
  const menu = document.createElement('div')
  menu.className = 'role-context-menu'
  menu.style.left = x + 'px'
  menu.style.top = y + 'px'
  
  const roles = ['member', 'moderator', 'admin']
  roles.forEach(role => {
    const item = document.createElement('div')
    item.className = 'menu-item'
    item.textContent = `Set as ${role}`
    item.onclick = () => {
      changeRole(member.userId, role)
      menu.remove()
    }
    menu.appendChild(item)
  })
  
  document.body.appendChild(menu)
  
  // Close menu on click outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove()
      document.removeEventListener('click', closeMenu)
    })
  }, 100)
}

async function changeRole(memberId, newRole) {
  if (!currentServer || !currentUser) return
  
  try {
    const response = await fetch(`${API_BASE}/servers/${currentServer.id}/members/${memberId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, newRole })
    })
    
    const data = await response.json()
    if (data.success) {
      currentServer.members[memberId].role = newRole
      loadMembers()
      alert(`Role updated to ${newRole}`)
    } else {
      alert(data.error || 'Failed to update role')
    }
  } catch (error) {
    console.error('Error changing role:', error)
    alert('Failed to update role')
  }
}

function updateUserUI() {
  const userName = document.getElementById('userName')
  if (userName && currentUser) {
    userName.textContent = currentUser.display_name || currentUser.displayName || 'User'
  }
}

// ---------- Event Listeners ----------

// Sign in button (logout)
document.getElementById('signInBtn')?.addEventListener('click', logout)

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

// Add channel button
document.getElementById('addChannelBtn')?.addEventListener('click', () => {
  const channelName = prompt('Enter channel name:')
  if (channelName) {
    createChannel(channelName)
  }
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
    const isHidden = rightPanel.style.display === 'none'
    rightPanel.style.display = isHidden ? 'flex' : 'none'
  }
})

// ---------- Initial Load ----------
window.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    updateUserUI()
    loadServers()
  }
})
