const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

let notes = []
let currentId = 1

const app = express()
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'frontend')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'))
})

// Routes API
// GET /notes - Récupérer toutes les notes
app.get('/notes', (req, res) => {
  console.log(`GET /notes - ${notes.length} notes retournées.`)
  res.json(notes)
})

// POST /notes - Créer une nouvelle
app.post('/notes', (req, res) => {
  const { content } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Le contenu de la note ne peut pas être vide.' })
  }

  const newNote = {
    id: currentId++,
    content: content.trim(),
    authorId: null,
  }

  notes.push(newNote)
  console.log(`POST /notes - Nouvelle note ajoutée avec ID: ${newNote.id}`)

  res.status(201).json(newNote)
})

// PUT /notes/:id - Mettre à jour une note existante.
app.put('/notes/:id', (req, res) => {
  const noteId = parseInt(req.params.id, 10)
  const { content } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Le contenu de la note ne peut pas être vide.' })
  }

  const noteIndex = notes.findIndex((n) => n.id === noteId)

  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note introuvable.' })
  }

  notes[noteIndex].content = content.trim()

  console.log(`PUT /notes/${noteId} - Note mise à jour.`)

  res.json(notes[noteIndex])
})

// DELETE /notes/:id - Supprime une note.
app.delete('/notes/:id', (req, res) => {
  const noteId = parseInt(req.params.id, 10)
  const initialLength = notes.length

  notes = notes.filter((n) => n.id !== noteId)

  if (notes.length === initialLength) {
    return res.status(404).json({ error: 'Note introuvable.' })
  }

  console.log(`DELETE /notes/${noteId} - Note supprimée.`)

  res.status(204).send()
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`)
})
