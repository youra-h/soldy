import { chromium } from 'playwright'
import { build } from 'vite'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
process.env.PROF = '1'
await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts'), logLevel: 'warn' })
const dist = path.resolve(import.meta.dirname, 'dist-prof')
const server = http
	.createServer((req, res) => {
		const f = path.join(dist, req.url === '/' ? 'index.html' : req.url)
		if (!fs.existsSync(f)) return res.writeHead(404).end()
		res.writeHead(200, {
			'content-type': f.endsWith('.js')
				? 'text/javascript'
				: f.endsWith('.css')
					? 'text/css'
					: 'text/html',
		})
		fs.createReadStream(f).pipe(res)
	})
	.listen(0)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto(`http://127.0.0.1:${server.address().port}/`)
await p.waitForFunction(() => 'bench' in window)
const cdp = await p.context().newCDPSession(p)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
async function prof(label, fn, arg) {
	await cdp.send('Profiler.start')
	await p.evaluate(fn, arg)
	const { profile } = await cdp.send('Profiler.stop')
	const self = new Map()
	const dt = profile.timeDeltas
	const byId = new Map(profile.nodes.map((n) => [n.id, n]))
	profile.samples.forEach((id, i) => {
		const n = byId.get(id)
		const f = n.callFrame
		const k = `${f.functionName || '(anon)'} ${f.url ? path.basename(f.url) + ':' + f.lineNumber : ''}`
		self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0))
	})
	const tot = [...self.values()].reduce((a, c) => a + c, 0)
	console.log(`\n== ${label}: ${Math.round(tot / 1000)} мс семплов`)
	;[...self]
		.sort((a, c) => c[1] - a[1])
		.slice(0, 18)
		.forEach(([k, v]) => console.log(String(Math.round(v / 1000)).padStart(6), k))
}
await prof('render 5000', (n) => bench.render(n), 5000)
await prof('selectAll', () => bench.selectAll())
await prof('sort asc', () => bench.sort())
await b.close()
server.close()
