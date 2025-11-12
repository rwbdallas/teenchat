// ---------- Supabase Init ----------
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lkyrypvkvndgutwvegep.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreXJ5cHZrdwVnZGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDk1NDgsImV4cCI6MjA3NzkyNTU0OH0.g53ITIaIpYNbaXM-xyapeP0awqXmR9bKGMflsG-TL8U'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---------- Global State ----------
let currentUser = null
let currentServer = null
let currentChannel = null
let messagesChannel = null
let members = {}

// ---------- Auth (Guest) ----------
async function guestLogin(displayName = "Guest") {
  currentUser = { id: `guest-${Date.now()}`, display_name: displayName }
  members[currentUser.id] = displayName
  updateMembersUI()
  loadServers()
}

// ---------- Servers ----------
async function loadServers() {
  const { data, error } = await supabase
    .from('servers')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return console.error(error)

  const serverContainer = document.querySelector('.server-list')
  if (!serverContainer) return
  serverContainer.innerHTML = ''

  data.forEach(server => {
    const btn = document.createElement('div')
    btn.className = 'server-btn'
    btn.textContent = server.name
    btn.onclick = () => selectServer(server)
    serverContainer.appendChild(btn)
  })
}

async function createServer(name) {
  if (!currentUser) return alert('Login first')
  const { data, error } = await supabase
    .from('servers')
    .insert([{ name, created_by: currentUser.id }])
  if (error) return alert(error.message)
  loadServers()
}

// ---------- Channels ----------
function selectServer(server) {
  currentServer = server
  currentChannel = { id: server.id, name: "general" } // default channel
  loadMessages(currentChannel.id)
}

// ---------- Messages ----------
async function loadMessages(channelId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, user_id')
    .eq('server_id', channelId)
    .order('created_at', { ascending: true })

  if (error) return console.error(error)

  const chatContainer = document.querySelector('.chat-messages')
  if (!chatContainer) return
  chatContainer.innerHTML = ''

  data.forEach(msg => appendMessage(msg))
  subscribeMessages(channelId)
}

function appendMessage(msg) {
  const chatContainer = document.querySelector('.chat-messages')
  if (!chatContainer) return

  const div = document.createElement('div')
  div.className = 'chat-message'
  const name = members[msg.user_id] || 'Unknown'
  div.textContent = `[${new Date(msg.created_at).toLocaleTimeString()}] ${name}: ${msg.body}`
  chatContainer.appendChild(div)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

async function sendMessage(body) {
  if (!currentUser || !currentChannel) return
  const { error } = await supabase.from('messages').insert([{
    body,
    server_id: currentChannel.id,
    user_id: currentUser.id
  }])
  if (error) console.error(error)
}

// ---------- Realtime ----------
function subscribeMessages(channelId) {
  if (messagesChannel) {
    messagesChannel.unsubscribe()
  }

  messagesChannel = supabase.channel(`messages-${channelId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `server_id=eq.${channelId}`
    }, payload => appendMessage(payload.new))
    .subscribe()
}

// ---------- Members UI ----------
function updateMembersUI() {
  const membersContainer = document.querySelector('.members-list')
  if (!membersContainer) return
  membersContainer.innerHTML = ''
  Object.values(members).forEach(name => {
    const div = document.createElement('div')
    div.className = 'member'
    div.textContent = name
    membersContainer.appendChild(div)
  })
}

// ---------- Event Listeners ----------

// Guest login button
document.querySelector('.guest-login-btn')?.addEventListener('click', () => guestLogin())

// Create server button
document.querySelector('.create-server-btn')?.addEventListener('click', () => {
  const input = document.querySelector('.create-server-input')
  if (input?.value) createServer(input.value)
  input.value = ''
})

// Send message on Enter
document.querySelector('.chat-input')?.addEventListener('keypress', e => {
  if (e.key === 'Enter' && e.target.value.trim() !== '') {
    sendMessage(e.target.value)
    e.target.value = ''
  }
})

// ---------- Initial Load ----------
guestLogin("Guest")
