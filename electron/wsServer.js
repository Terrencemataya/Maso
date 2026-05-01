const { WebSocketServer } = require('ws')
const net = require('net')

class WsStreamServer {
  constructor() {
    this.wss = null
    this.port = null
    this.clients = new Set()
    this.headerCache = []
  }

  async start() {
    this.port = await this._getFreePort()

    this.wss = new WebSocketServer({ port: this.port })

    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      // Send the cached header to the new client
      for (const chunk of this.headerCache) {
        if (ws.readyState === 1) {
          try { ws.send(chunk, { binary: true }) } catch {}
        }
      }
      ws.on('close', () => this.clients.delete(ws))
      ws.on('error', () => this.clients.delete(ws))
    })

    this.wss.on('error', (err) => {
      console.error('[WS] Server error:', err.message)
    })

    console.log(`[WS] Stream server listening on port ${this.port}`)
    return this.port
  }

  broadcast(chunk) {
    // Cache the first few chunks (FLV header + metadata + AVC sequence header)
    if (this.headerCache.length < 5) {
      this.headerCache.push(chunk)
    }

    if (this.clients.size === 0) return
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(chunk, { binary: true })
        } catch {}
      }
    }
  }

  stop() {
    for (const client of this.clients) {
      try { client.terminate() } catch {}
    }
    this.clients.clear()
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }

  _getFreePort() {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      server.on('error', reject)
      server.listen(0, () => {
        const { port } = server.address()
        server.close(() => resolve(port))
      })
    })
  }
}

module.exports = WsStreamServer
