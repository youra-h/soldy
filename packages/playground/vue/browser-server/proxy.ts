import { Agent, createServer, request } from 'node:http'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import { connect } from 'node:net'

/**
 * The Vitest server for the browser in the container — runs inside it, next
 * to the Playwright server (`server.ts`, `dockerRunArgs`).
 *
 * The run opens its pages at `127.0.0.1:<port>`, and in the container that is
 * this proxy: it passes requests on to the same port of the machine Docker
 * runs on (`host.docker.internal` — Docker Desktop delivers it to the
 * machine's loopback, where Vitest listens).
 *
 * A proxy that knows HTTP, not a plain pipe of connections: WebKit opens a
 * connection of its own for each request it revalidates (a 304 answer) and
 * closes it after — some 18 000 connections a full run. Piped to the machine,
 * each left a closed port waiting there (Windows keeps them for two minutes),
 * the ports ran out midway, and modules stopped loading. Here those
 * connections stay inside the container, and the machine sees the few
 * long-lived ones of the proxy (`keepAlive`). WebSockets — the run's RPC —
 * go through as they are.
 */

const port = Number(process.argv[2])

/** Where Docker Desktop reaches the machine it runs on. */
const MACHINE = 'host.docker.internal'

/** Connections to the machine, kept open between requests. */
const agent = new Agent({ keepAlive: true, maxSockets: 32 })

/** Headers of one connection, which a proxy doesn't pass on (RFC 9110, 7.6.1). */
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade']

function endToEnd(headers: IncomingHttpHeaders): IncomingHttpHeaders {
	const passed = { ...headers }

	for (const name of HOP_BY_HOP) delete passed[name]

	return passed
}

/** Requests without a body, safe to send again. */
const REPEATABLE = new Set(['GET', 'HEAD'])

/**
 * One request to the machine. A kept connection the server has just closed
 * as idle fails the request sent over it (`reusedSocket`); such a request,
 * without a body, goes once more over a fresh connection.
 */
function forward(incoming: IncomingMessage, answer: ServerResponse, retry: boolean): void {
	const outgoing = request(
		{
			host: MACHINE,
			port,
			method: incoming.method,
			path: incoming.url,
			headers: endToEnd(incoming.headers),
			agent,
		},
		(response) => {
			answer.writeHead(response.statusCode ?? 502, endToEnd(response.headers))
			response.pipe(answer)
		},
	)

	outgoing.on('error', () => {
		if (retry && outgoing.reusedSocket && !answer.headersSent) forward(incoming, answer, false)
		else answer.destroy()
	})

	if (REPEATABLE.has(incoming.method ?? '')) outgoing.end()
	else incoming.pipe(outgoing)
}

const proxy = createServer((incoming, answer) => {
	forward(incoming, answer, REPEATABLE.has(incoming.method ?? ''))
})

proxy.on('upgrade', (incoming, socket, head) => {
	const outgoing = connect(port, MACHINE, () => {
		const lines = [`${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}`]

		for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
			lines.push(`${incoming.rawHeaders[index]}: ${incoming.rawHeaders[index + 1]}`)
		}

		outgoing.write(`${lines.join('\r\n')}\r\n\r\n`)
		outgoing.write(head)
		socket.pipe(outgoing).pipe(socket)
	})

	outgoing.on('error', () => socket.destroy())
	socket.on('error', () => outgoing.destroy())
})

proxy.listen(port, '127.0.0.1')
