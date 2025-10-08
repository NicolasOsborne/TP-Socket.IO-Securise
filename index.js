const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'frontend')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'))
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`)
})
