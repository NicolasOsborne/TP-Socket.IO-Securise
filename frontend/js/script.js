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

// Pour l'instant, on simule un utilisateur (avant l'authentification)
let AUTH_TOKEN = null
let CURRENT_USER_ID = null
const CURRENT_USER_NAME = 'Utilisateur Test'

function getAuthHeaders() {
  if (!AUTH_TOKEN) {
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  }
}

async function authenticateTestUser() {
  try {
    const response = await fetch('/auth/login_test')
    if (!response.ok)
      throw new Error('Échec de la récupération du token de test.')

    const data = await response.json()

    AUTH_TOKEN = data.token
    CURRENT_USER_ID = data.userId

    console.log(`[AUTH] Connexion de test réussie. User ID: ${CURRENT_USER_ID}`)

    fetchNotes()
  } catch (error) {
    console.error("Erreur lors de l'authentification de test:", error)
    alert(
      "Erreur lors de l'authentification de test. Les fonctionnalités d'écriture seront désactivées."
    )
    fetchNotes()
  }
}

/**
 * Crée le HTML pour une note individuelle (Post-it).
 * @param {object} note - La note à afficher.
 */
function createNoteElement(note) {
  const noteCard = document.createElement('div')
  noteCard.className = 'note-card'
  noteCard.setAttribute('data-id', note.id)

  const content = document.createElement('div')
  content.className = 'note-content'
  content.textContent = note.content

  const author = document.createElement('div')
  author.className = 'note-author'
  const authorName =
    note.authorId === CURRENT_USER_ID
      ? `${CURRENT_USER_NAME} (Moi)`
      : `Auteur ID: ${note.authorId || 'N/A'}`
  author.textContent = `Créé par: ${authorName}`

  const actions = document.createElement('div')
  actions.className = 'note-actions'

  const editBtn = document.createElement('button')
  editBtn.textContent = 'Modifier'
  editBtn.addEventListener('click', () => showFormModal(note))

  const deleteBtn = document.createElement('button')
  deleteBtn.textContent = 'Supprimer'
  deleteBtn.addEventListener('click', () => deleteNote(note.id))

  if (note.authorId === CURRENT_USER_ID) {
    actions.appendChild(editBtn)
    actions.appendChild(deleteBtn)
  }

  noteCard.appendChild(content)
  noteCard.appendChild(author)
  noteCard.appendChild(actions)

  return noteCard
}

/**
 * Met à jour la zone d'affichage avec le tableau de notes.
 * @param {Array<object>} notesArray - Le tableau de notes à afficher.
 */
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

// --- Fonctions d'Interaction API REST ---

/**
 * Récupère toutes les notes via l'API REST.
 */
async function fetchNotes() {
  loadingMessage.textContent = 'Chargement en cours...'
  try {
    const response = await fetch('/notes')
    const notesData = await response.json()
    renderNotes(notesData)
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error)
    notesDisplayArea.innerHTML =
      '<p style="color: red;">Erreur de connexion au serveur.</p>'
  }
}

/**
 * Crée une note via l'API REST.
 * @param {string} content - Le contenu de la note.
 */
async function createNote(content) {
  try {
    const response = await fetch('/notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: content }),
    })

    if (response.status === 401 || response.status === 403) {
      alert('Action refusée. Vous devez être connecté pour créer une note.')
      throw new Error(`Erreur d'autorisation: ${response.status}`)
    }
    if (!response.ok) throw new Error('Échec de la création de la note.')
  } catch (error) {
    console.error('Erreur POST:', error)
    alert("Erreur lors de l'ajout de la note.")
  }
}

/**
 * Met à jour une note via l'API REST.
 * @param {number} id - L'ID de la note.
 * @param {string} content - Le nouveau contenu.
 */
async function updateNote(id, content) {
  try {
    const response = await fetch(`/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: content }),
    })
    if (response.status === 401) {
      alert('Action refusée. Vous devez être connecté pour modifier une note.')
      throw new Error(`Erreur d'authentification: 401`)
    }
    if (response.status === 403) {
      alert('Action refusée. Vous ne pouvez modifier que vos propres notes.')
      throw new Error(`Erreur d'autorisation: 403`)
    }
    if (!response.ok) throw new Error('Échec de la mise à jour de la note.')
  } catch (error) {
    console.error('Erreur PUT:', error)
    alert('Erreur lors de la modification de la note.')
  }
}

/**
 * Supprime une note via l'API REST.
 * @param {number} id - L'ID de la note à supprimer.
 */
async function deleteNote(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return

  try {
    const response = await fetch(`/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (response.status === 401) {
      alert('Action refusée. Vous devez être connecté pour supprimer une note.')
      throw new Error(`Erreur d'authentification: 401`)
    }
    if (response.status === 403) {
      alert('Action refusée. Vous ne pouvez supprimer que vos propres notes.')
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
    alert(
      'Erreur lors de la suppression de la note. (Peut-être déjà supprimée?)'
    )
  }
}

// --- Logique du Formulaire Modale ---

/**
 * Affiche la fenêtre modale du formulaire (Ajout ou Modification).
 * @param {object} [noteToEdit=null] - La note à éditer, ou null pour une nouvelle note.
 */
function showFormModal(noteToEdit = null) {
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
    alert('Le contenu ne peut pas être vide.')
    return
  }

  if (id) {
    updateNote(parseInt(id, 10), content)
  } else {
    createNote(content)
  }

  hideFormModal()
})

btnRefresh.addEventListener('click', fetchNotes)
btnAddNote.addEventListener('click', () => showFormModal(null))
formCancelBtn.addEventListener('click', hideFormModal)
modalCloseBtn.addEventListener('click', hideFormModal)

socket.on('connect', () => {
  console.log('[Socket.IO] Connecté au serveur.')
})

// Événement Temps Réel : Mises à jour des notes
socket.on('notes_updated', (updatedNotes) => {
  console.log('[Socket.IO] Réception des mises à jour des notes.')
  renderNotes(updatedNotes)
})

// fetchNotes()
authenticateTestUser()
