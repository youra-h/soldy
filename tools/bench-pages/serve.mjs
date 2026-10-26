import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

/** Типы файлов сборки для сервера страницы. */
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
}

/**
 * Server of the built page on a free port, its address in `base`. `dist` — the
 * build folder: the page run serves `dist`, the heap snapshot — `dist-prof`.
 */
export function serve(dist = path.resolve(import.meta.dirname, 'dist')) {
	const server = http
		.createServer((req, res) => {
			const p = req.url.split('?')[0]
			const f = path.join(dist, p === '/' ? 'index.html' : p)
			if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end()
			res.writeHead(200, {
				'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream',
			})
			fs.createReadStream(f).pipe(res)
		})
		.listen(0)

	return { server, base: `http://127.0.0.1:${server.address().port}/` }
}
