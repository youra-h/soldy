import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

/** File types of the builds: the neighbors' themes load fonts, images and JSON as well. */
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
}

/** A server of a built folder on a free port; the address is `base`. */
export function serve(dist) {
	const server = http
		.createServer((req, res) => {
			const p = decodeURIComponent(req.url.split('?')[0])
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
