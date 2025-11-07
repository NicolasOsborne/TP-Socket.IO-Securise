const socket = io()

const notesDisplayArea = document.getElementById('notes-display-area')
const loadingMessage = document.getElementById('loading-message')

const btnRefresh = document.getElementById('btn-refresh')
const btnAddNote = document.getElementById('btn-add-note')

const modalFormWindow = document.getElementById('modal-form-window')
const modalTitle = document.getElementById('modal-title')

const noteForm = document.getElementById('note-form')
const noteContentInput = document.getElementById('note-content')
const noteIdHidden = document.getElementById('note-id-hidden')

const formSubmitBtn = document.getElementById('form-submit-btn')
const formCancelBtn = document.getElementById('form-cancel-btn')

const modalCloseBtn = document.getElementById('modal-close-btn')

const btnRegister = document.getElementById('btn-register')
const btnLogin = document.getElementById('btn-login')
const btnLogout = document.getElementById('btn-logout')

const currentUsernameDisplay = document.getElementById('current-username')

const loginWindow = document.getElementById('login-window')
const registerWindow = document.getElementById('register-window')
const loginCloseBtn = document.getElementById('login-close-btn')
const registerCloseBtn = document.getElementById('register-close-btn')
const loginForm = document.getElementById('login-form')
const registerForm = document.getElementById('register-form')
const loginUserInfo = document.getElementById('login-user-info')

const messageWindow = document.getElementById('message-window')
const messageTitle = document.getElementById('message-title')
const messageContent = document.getElementById('message-content')
const messageOkBtn = document.getElementById('message-ok-btn')
const messageCloseBtn = document.getElementById('message-close-btn')
const confirmWindow = document.getElementById('confirm-window')
const confirmTitle = document.getElementById('confirm-title')
const confirmContent = document.getElementById('confirm-content')
const confirmYesBtn = document.getElementById('confirm-yes-btn')
const confirmNoBtn = document.getElementById('confirm-no-btn')
const confirmCloseBtn = document.getElementById('confirm-close-btn')

// Initialisation de l'état d'authentification via localStorage
let AUTH_TOKEN = localStorage.getItem('AUTH_TOKEN')
let CURRENT_USER_ID = parseInt(localStorage.getItem('CURRENT_USER_ID')) || null
let CURRENT_USER_NAME = localStorage.getItem('CURRENT_USER_NAME') || 'Visiteur'

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
  }
  return headers
}

function checkAuthStatus() {
  if (AUTH_TOKEN && CURRENT_USER_ID) {
    console.log(
      `[AUTH] Token trouvé. Connecté en tant que: ${CURRENT_USER_NAME} (ID: ${CURRENT_USER_ID})`
    )
    currentUsernameDisplay.textContent = `${CURRENT_USER_NAME}`
    loginUserInfo.style.display = 'block'
    loginForm.style.display = 'none'
    btnAddNote.disabled = false
  } else {
    console.log('[AUTH] Non connecté.')
    currentUsernameDisplay.textContent = 'Non connecté'
    loginUserInfo.style.display = 'none'
    loginForm.style.display = 'block'
    btnAddNote.disabled = true
  }
  fetchNotes()
}

function handleAuthSuccess(data) {
  AUTH_TOKEN = data.token
  CURRENT_USER_ID = data.userId
  CURRENT_USER_NAME = data.username

  localStorage.setItem('AUTH_TOKEN', AUTH_TOKEN)
  localStorage.setItem('CURRENT_USER_ID', CURRENT_USER_ID)
  localStorage.setItem('CURRENT_USER_NAME', CURRENT_USER_NAME)

  checkAuthStatus()
  hideLoginModal()
  hideRegisterModal()
}

function logout() {
  AUTH_TOKEN = null
  CURRENT_USER_ID = null
  CURRENT_USER_NAME = 'Visiteur'
  localStorage.removeItem('AUTH_TOKEN')
  localStorage.removeItem('CURRENT_USER_ID')
  localStorage.removeItem('CURRENT_USER_NAME')

  showAlert('Vous êtes déconnecté.')
  checkAuthStatus()
}

function showLoginModal() {
  checkAuthStatus()
  loginWindow.classList.remove('hidden')
  registerWindow.classList.add('hidden')
}
function hideLoginModal() {
  loginWindow.classList.add('hidden')
  loginForm.reset()
}
function showRegisterModal() {
  registerWindow.classList.remove('hidden')
  loginWindow.classList.add('hidden')
}
function hideRegisterModal() {
  registerWindow.classList.add('hidden')
  registerForm.reset()
}

// Authentification et Inscription
btnLogin.addEventListener('click', showLoginModal)
btnRegister.addEventListener('click', showRegisterModal)
btnLogout.addEventListener('click', logout)
loginCloseBtn.addEventListener('click', hideLoginModal)
registerCloseBtn.addEventListener('click', hideRegisterModal)

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = e.target.querySelector('#login-username').value
  const password = e.target.querySelector('#login-password').value

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      showAlert(`Échec de la connexion: ${data.error}`)
      return
    }

    handleAuthSuccess(data)
  } catch (error) {
    console.error('Erreur Login:', error)
    showAlert('Erreur lors de la connexion au serveur.')
  }
})

// Inscription
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = e.target.querySelector('#register-username').value
  const password = e.target.querySelector('#register-password').value

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      showAlert(`Échec de l'inscription: ${data.error}`)
      return
    }

    showAlert('Inscription réussie ! Connexion automatique.')
    handleAuthSuccess(data)
  } catch (error) {
    console.error('Erreur Register:', error)
    showAlert("Erreur lors de l'inscription au serveur.")
  }
})

// Notes (CRUD et Affichage)
// Créer une note
function createNoteElement(note) {
  const noteCard = document.createElement('div')
  noteCard.className = 'window note-card'
  noteCard.setAttribute('data-id', note.id)

  const content = document.createElement('div')
  content.className = 'note-content'
  content.textContent = note.content

  const author = document.createElement('div')
  author.className = 'title-bar'
  const isOwner = note.authorId === CURRENT_USER_ID
  const authorName = isOwner
    ? `${CURRENT_USER_NAME} (Moi)`
    : `${note.authorName || 'N/A'}`
  author.textContent = `Créé par: ${authorName}`

  const actions = document.createElement('div')
  actions.className = 'note-actions'

  const editBtn = document.createElement('button')
  editBtn.textContent = 'Modifier'
  editBtn.addEventListener('click', () => showFormModal(note))

  const deleteBtn = document.createElement('button')
  deleteBtn.textContent = 'Supprimer'
  deleteBtn.addEventListener('click', () => deleteNote(note.id))

  if (isOwner) {
    actions.appendChild(editBtn)
    actions.appendChild(deleteBtn)
  }

  noteCard.appendChild(author)
  noteCard.appendChild(content)
  noteCard.appendChild(actions)

  return noteCard
}

// Afficher et mettre à jour les notes
function renderNotes(notesArray) {
  notesDisplayArea.innerHTML = ''
  if (notesArray.length === 0) {
    notesDisplayArea.innerHTML =
      '<p id="loading-message">Aucune note pour le moment. Cliquez sur "Ajouter une Nouvelle Note" pour commencer.</p>'
  } else {
    notesArray.forEach((note) => {
      notesDisplayArea.appendChild(createNoteElement(note))
    })
  }
}

// Fonctions d'Interaction API REST
// GET
async function fetchNotes() {
  loadingMessage.textContent = 'Chargement en cours...'
  try {
    const response = await fetch('/notes', {
      method: 'GET',
    })
    const notesData = await response.json()
    renderNotes(notesData)
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error)
    notesDisplayArea.innerHTML =
      '<p style="color: red;">Erreur de connexion au serveur.</p>'
  }
}

// POST
async function createNote(content) {
  try {
    const response = await fetch('/notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: content }),
    })

    if (response.status === 401 || response.status === 403) {
      showAlert('Action refusée. Vous devez être connecté pour créer une note.')
      throw new Error(`Erreur d'autorisation: ${response.status}`)
    }
    if (!response.ok) throw new Error('Échec de la création de la note.')
  } catch (error) {
    console.error('Erreur POST:', error)
    showAlert("Erreur lors de l'ajout de la note.")
  }
}

// PUT
async function updateNote(id, content) {
  try {
    const response = await fetch(`/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: content }),
    })
    if (response.status === 401) {
      showAlert(
        'Action refusée. Vous devez être connecté pour modifier une note.'
      )
      throw new Error(`Erreur d'authentification: 401`)
    }
    if (response.status === 403) {
      showAlert(
        'Action refusée. Vous ne pouvez modifier que vos propres notes.'
      )
      throw new Error(`Erreur d'autorisation: 403`)
    }
    if (!response.ok) throw new Error('Échec de la mise à jour de la note.')
  } catch (error) {
    console.error('Erreur PUT:', error)
    showAlert('Erreur lors de la modification de la note.')
  }
}

// DELETE
async function deleteNote(id) {
  if (!showConfirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return

  try {
    const response = await fetch(`/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (response.status === 401) {
      showAlert(
        'Action refusée. Vous devez être connecté pour supprimer une note.'
      )
      throw new Error(`Erreur d'authentification: 401`)
    }
    if (response.status === 403) {
      showAlert(
        'Action refusée. Vous ne pouvez supprimer que vos propres notes.'
      )
      throw new Error(`Erreur d'autorisation: 403`)
    }
    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Échec de la suppression: ${response.status} ${errorBody}`
      )
    }
  } catch (error) {
    console.error('Erreur DELETE:', error)
    showAlert(
      'Erreur lors de la suppression de la note. (Peut-être déjà supprimée?)'
    )
  }
}

// Logique du Formulaire Modale
function showFormModal(noteToEdit = null) {
  if (!AUTH_TOKEN) {
    showAlert('Veuillez vous connecter pour créer ou modifier une note.')
    showLoginModal()
    return
  }
  if (noteToEdit) {
    // Modification
    modalTitle.textContent = 'Modifier la Note'
    noteContentInput.value = noteToEdit.content
    noteIdHidden.value = noteToEdit.id
    formSubmitBtn.textContent = 'Mettre à jour'
  } else {
    // Ajout
    modalTitle.textContent = 'Ajouter une Nouvelle Note'
    noteContentInput.value = ''
    noteIdHidden.value = ''
    formSubmitBtn.textContent = 'Enregistrer'
  }
  modalFormWindow.classList.remove('hidden')
}

function hideFormModal() {
  modalFormWindow.classList.add('hidden')
  noteForm.reset()
}

// Gestion de la soumission du formulaire (Ajout ou Modification)
noteForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const content = noteContentInput.value.trim()
  const id = noteIdHidden.value

  if (!content) {
    showAlert('Le contenu ne peut pas être vide.')
    return
  }

  if (id) {
    updateNote(parseInt(id, 10), content)
  } else {
    createNote(content)
  }

  hideFormModal()
})

// Modales d'alerte et confirmation
function showAlert(message, title = 'Message') {
  messageTitle.textContent = title
  messageContent.textContent = message
  messageWindow.classList.remove('hidden')
}

function hideAlert() {
  messageWindow.classList.add('hidden')
}
messageOkBtn.addEventListener('click', hideAlert)
messageCloseBtn.addEventListener('click', hideAlert)

btnRefresh.addEventListener('click', fetchNotes)
btnAddNote.addEventListener('click', () => showFormModal(null))
formCancelBtn.addEventListener('click', hideFormModal)
modalCloseBtn.addEventListener('click', hideFormModal)

function showConfirm(message, callback, title = 'Confirmation') {
  confirmTitle.textContent = title
  confirmContent.textContent = message
  confirmWindow.classList.remove('hidden')

  confirmYesBtn.replaceWith(confirmYesBtn.cloneNode(true))
  confirmNoBtn.replaceWith(confirmNoBtn.cloneNode(true))
  confirmCloseBtn.replaceWith(confirmCloseBtn.cloneNode(true))

  const newConfirmYesBtn = document.getElementById('confirm-yes-btn')
  const newConfirmNoBtn = document.getElementById('confirm-no-btn')
  const newConfirmCloseBtn = document.getElementById('confirm-close-btn')

  newConfirmYesBtn.addEventListener('click', () => {
    confirmWindow.classList.add('hidden')
    callback(true)
  })

  const cancelHandler = () => {
    confirmWindow.classList.add('hidden')
    callback(false)
  }
  newConfirmNoBtn.addEventListener('click', cancelHandler)
  newConfirmCloseBtn.addEventListener('click', cancelHandler)
}

// Connexion au Socket.IO
socket.on('connect', () => {
  console.log('[Socket.IO] Connecté au serveur.')
})

// Événement Temps Réel : Mises à jour des notes
socket.on('notes_updated', (updatedNotes) => {
  console.log('[Socket.IO] Réception des mises à jour des notes.')
  renderNotes(updatedNotes)
})

checkAuthStatus()
