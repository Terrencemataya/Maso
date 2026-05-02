/**
 * ONVIF Discovery Module
 * Stub implementation — discovers ONVIF-compatible devices on local network.
 * In production, integrate with the 'onvif' npm package or node-onvif.
 */

const dgram = require('dgram')
const crypto = require('crypto')

const WS_DISCOVERY_PROBE = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
  xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
  xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
  xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:${crypto.randomUUID()}</w:MessageID>
    <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`


async function discover(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const devices = []
    const socket = dgram.createSocket('udp4')
    const MULTICAST_ADDR = '239.255.255.250'
    const MULTICAST_PORT = 3702

    socket.on('error', (err) => {
      console.error('[ONVIF] Discovery error:', err.message)
      socket.close()
      resolve(devices)
    })

    socket.on('message', (msg, rinfo) => {
      const body = msg.toString()
      const xaddrsMatch = body.match(/<[^>]*XAddrs[^>]*>([^<]+)</)
      const typesMatch = body.match(/<[^>]*Types[^>]*>([^<]+)</)

      if (xaddrsMatch) {
        const xaddrs = xaddrsMatch[1].trim().split(' ')
        devices.push({
          ip: rinfo.address,
          xaddrs,
          types: typesMatch ? typesMatch[1].trim() : 'Unknown',
          name: `ONVIF Device @ ${rinfo.address}`,
        })
      }
    })

    socket.bind(() => {
      socket.setBroadcast(true)
      try {
        socket.addMembership(MULTICAST_ADDR)
      } catch {}

      const probe = Buffer.from(WS_DISCOVERY_PROBE)
      socket.send(probe, 0, probe.length, MULTICAST_PORT, MULTICAST_ADDR, (err) => {
        if (err) console.error('[ONVIF] Send error:', err.message)
      })

      setTimeout(() => {
        try { socket.close() } catch {}
        console.log(`[ONVIF] Discovered ${devices.length} device(s)`)
        resolve(devices)
      }, timeoutMs)
    })
  })
}

module.exports = { discover }
