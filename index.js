const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10

require('dotenv').config()

const JWT_SECRET = process.env.JWT_SECRET

let notes = []
let currentId = 1

let users = []
let currentUserId = 1

const app = express()
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})

app.use(express.static(path.join(__dirname, 'frontend')))

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) {
    return res.status(401).json({ error: 'Accès non autorisé.' })
  }

  jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
    if (err) {
      console.log('Token invalide ou expiré.', err.message)
      return res
        .status(401)
        .json({ error: 'Accès non autorisé: Token JWT invalide ou expiré.' })
    }

    if (decodedPayload.userId) {
      req.userId = decodedPayload.userId
      console.log(`Succès. Utilisateur ID: ${req.userId}`)
      next()
    } else {
      console.error('Erreur: Payload JWT sans userId.')
      return res
        .status(401)
        .json({ error: 'Token valide mais données utilisateur manquantes.' })
    }
  })
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'))
})

// Connexion Socket.IO
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connecté: ${socket.id}`)

  socket.emit('notes_updated', notes)

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client déconnecté: ${socket.id}`)
  })
})

// Authentification utilisateur
// Inscription d'un nouvel utilsateur
app.post('/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nom d'utilisateur et mot de passe requis !" })
  }

  if (users.find((u) => u.username === username)) {
    return res
      .status(409)
      .json({ error: "Ce nom d'utilisateur est déjà pris !" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const newUser = {
      id: currentUserId++,
      username: username,
      password: hashedPassword,
    }

    users.push(newUser)
    console.log(
      `[REGISTER] Nouvel utilisateur enregistré : ${username} (ID: ${newUser.id})`
    )

    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.status(201).json({
      message: 'Vous êtes bien inscrit !',
      token: token,
      userId: newUser.id,
      username: newUser.username,
    })
  } catch (error) {
    console.error("[REGISTER] Erreur lors de l'inscription.", error)
    res.status(500).json({ error: "Erreur lors de l'inscription." })
  }
})

// Connexion d'un utilisateur existant
app.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nom d'utilisateur et mot de passe requis !" })
  }

  const user = users.find((u) => u.username === username)

  if (!user) {
    return res.status(401).json({ error: "Nom d'utilisateur invalide !" })
  }

  try {
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Mot de passe invalide !' })
    }

    const payload = {
      userId: user.id,
      username: user.username,
    }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

    console.log(`[LOGIN] Connexion réussie pour l'utilisateur : ${username}`)

    res.json({
      token: token,
      userId: user.id,
      username: user.username,
    })
  } catch (error) {
    console.error('[LOGIN] Erreur de connexion.', error)
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' })
  }
})

// Routes API
// GET /notes - Récupérer toutes les notes
app.get('/notes', (req, res) => {
  console.log(`GET /notes - ${notes.length} notes retournées.`)
  const notesWithAuthors = notes.map((note) => {
    const author = users.find((u) => u.id === note.authorId)
    return {
      ...note,
      authorName: author ? author.username : 'Utilisateur Inconnu',
    }
  })

  // 💡 Renvoyer le nouveau tableau de notes
  res.json(notesWithAuthors)
})

// POST /notes - Créer une nouvelle
app.post('/notes', authenticateToken, (req, res) => {
  const { content } = req.body
  const authorId = req.userId

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Le contenu de la note ne peut pas être vide.' })
  }

  const newNote = {
    id: currentId++,
    content: content.trim(),
    authorId: authorId,
  }

  notes.push(newNote)
  console.log(`POST /notes - Nouvelle note ajoutée avec ID: ${newNote.id}`)

  io.emit('notes_updated', notes)

  res.status(201).json(newNote)
})

// PUT /notes/:id - Mettre à jour une note existante.
app.put('/notes/:id', authenticateToken, (req, res) => {
  const noteId = parseInt(req.params.id, 10)
  const { content } = req.body
  const currentUserId = req.userId

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Le contenu de la note ne peut pas être vide.' })
  }

  const noteIndex = notes.findIndex((n) => n.id === noteId)

  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note introuvable.' })
  }

  if (notes[noteIndex].authorId !== currentUserId) {
    console.log(
      `PUT /notes/${noteId} Refus 403. User ${currentUserId} n'est pas l'auteur (${notes[noteIndex].authorId}).`
    )
    return res.status(403).json({
      error: 'Accès interdit. Vous ne pouvez modifier que vos propres notes.',
    })
  }

  notes[noteIndex].content = content.trim()

  console.log(
    `PUT /notes/${noteId} - Note mise à jour par User: ${currentUserId}.`
  )

  io.emit('notes_updated', notes)

  res.json(notes[noteIndex])
})

// DELETE /notes/:id - Supprimer une note.
app.delete('/notes/:id', authenticateToken, (req, res) => {
  const noteId = parseInt(req.params.id, 10)
  const currentUserId = req.userId

  const noteToDelete = notes.find((n) => n.id === noteId)

  if (!noteToDelete) {
    return res.status(404).json({ error: 'Note introuvable.' })
  }

  if (noteToDelete.authorId !== currentUserId) {
    console.log(
      `[REST] DELETE /notes/${noteId} Refus 403. User ${currentUserId} n'est pas l'auteur (${noteToDelete.authorId}).`
    )
    return res.status(403).json({
      error: 'Accès interdit. Vous ne pouvez supprimer que vos propres notes.',
    })
  }

  notes = notes.filter((n) => n.id !== noteId)

  console.log(`DELETE /notes/${noteId} - Note supprimée.`)

  io.emit('notes_updated', notes)

  res.status(204).send()
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`)
})
