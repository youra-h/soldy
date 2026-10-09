import { chromium } from 'playwright'
import { build } from 'vite'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Снимок кучи: что прибавляют N строк таблицы soldy. Два снимка на одной
 * странице — пустая таблица и N строк, — разница по группам делится на N.
 * Группа — конструктор объекта, имя функции замыкания или тип узла; у
 * простых объектов (`Object`) имени нет, и группой служит набор их свойств.
 *
 *   npm run heap -- 500 multiple        # строк, режим выбора[, сколько групп показать]
 *   npm run heap -- 500 none
 */
const N = Number(process.argv[2] ?? 500)
const MODE = process.argv[3] ?? 'multiple'
const TOP = Number(process.argv[4] ?? 45)
process.env.PROF = '1'
await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts'), logLevel: 'warn' })
const dist = path.resolve(import.meta.dirname, 'dist-prof')
const server = http
	.createServer((req, res) => {
		const p = req.url.split('?')[0]
		const f = path.join(dist, p === '/' ? 'index.html' : p)
		if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end()
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
const browser = await chromium.launch({ args: ['--js-flags=--expose-gc'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(`http://127.0.0.1:${server.address().port}/?lib=soldy&mode=${MODE}`)
await page.waitForFunction(() => 'bench' in window)
const cdp = await page.context().newCDPSession(page)

async function snapshot() {
	await page.evaluate(() => gc())
	const chunks = []
	const onChunk = (e) => chunks.push(e.chunk)
	cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk)
	await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
	cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk)
	return group(JSON.parse(chunks.join('')))
}

/** Сумма собственного размера и число узлов по группам. */
function group(snap) {
	const m = snap.snapshot.meta
	const nf = m.node_fields.length
	const ef = m.edge_fields.length
	const nodeTypes = m.node_types[0]
	const edgeTypes = m.edge_types[0]
	const [iType, iName, iSize, iEdges] = ['type', 'name', 'self_size', 'edge_count'].map((k) =>
		m.node_fields.indexOf(k),
	)
	const [eType, eName] = ['type', 'name_or_index'].map((k) => m.edge_fields.indexOf(k))
	const { nodes, edges, strings } = snap
	// Место объявления замыкания: строка в несжатой сборке (`dist-prof`)
	const where = new Map()
	if (snap.locations) {
		const lf = m.location_fields.length
		const [lNode, lLine] = ['object_index', 'line'].map((k) => m.location_fields.indexOf(k))
		for (let i = 0; i < snap.locations.length; i += lf)
			where.set(snap.locations[i + lNode], snap.locations[i + lLine] + 1)
	}
	const iTo = m.edge_fields.indexOf('to_node')
	// Первый сильный владелец узла: по нему внутренние узлы (массивы,
	// контексты замыканий, хранилища свойств) относятся к объекту
	const owner = new Int32Array(nodes.length / nf).fill(-1)
	const ownerEdge = new Int32Array(nodes.length / nf)
	{
		let e2 = 0
		for (let n = 0; n < nodes.length; n += nf) {
			const c = nodes[n + iEdges]
			for (let k = 0; k < c; k++, e2 += ef) {
				const t = edgeTypes[edges[e2 + eType]]
				if (t === 'weak' || t === 'shortcut') continue
				const to = edges[e2 + iTo] / nf
				if (owner[to] === -1) {
					owner[to] = n / nf
					ownerEdge[to] = t === 'element' || t === 'hidden' ? -1 : edges[e2 + eName]
				}
			}
		}
	}
	const names = new Array(nodes.length / nf)
	const out = new Map()
	let e = 0
	for (let n = 0; n < nodes.length; n += nf) {
		const type = nodeTypes[nodes[n + iType]]
		const count = nodes[n + iEdges]
		let name = strings[nodes[n + iName]]
		if (type === 'object' && name === 'Object') {
			const props = []
			for (let k = 0; k < count && props.length < 7; k++) {
				const at = e + k * ef
				if (edgeTypes[edges[at + eType]] === 'property')
					props.push(strings[edges[at + eName]])
			}
			name = `{${props.join(',')}}`
		} else if (type === 'closure')
			name = `ƒ ${name || '(anon)'}${where.has(n) ? ' :' + where.get(n) : ''}`
		else if (type !== 'object')
			name = `(${type}) ${type === 'string' || type === 'number' ? '' : name}`.trim()
		name = name.replace(/ @\d+$/, '')
		names[n / nf] = name
		const g = out.get(name) ?? { size: 0, count: 0 }
		g.size += nodes[n + iSize]
		g.count++
		out.set(name, g)
		e += count * ef
	}
	// Внутренние узлы — к владельцу, до первого невнутреннего
	const internal = (i) =>
		/^\((array|hidden|code|object shape)\)|^system \/|^\(native\) system \//.test(names[i])
	const byOwner = new Map()
	let jsSize = 0
	for (let i = 0; i < names.length; i++) {
		const nt = nodeTypes[nodes[i * nf + iType]]
		if (nt === 'native' && !names[i].startsWith('(native) system')) continue
		jsSize += nodes[i * nf + iSize]
		if (!internal(i)) continue
		let o = owner[i],
			via = ownerEdge[i],
			hops = 0
		while (o >= 0 && internal(o) && hops++ < 8) {
			via = ownerEdge[o]
			o = owner[o]
		}
		const key =
			(o >= 0 ? names[o] : '?') + ' → ' + names[i] + (via >= 0 ? ' .' + strings[via] : '')
		const g = byOwner.get(key) ?? { size: 0, count: 0 }
		g.size += nodes[i * nf + iSize]
		g.count++
		byOwner.set(key, g)
	}
	// Дерево доминаторов (Cooper–Harvey–Kennedy): каждый узел относится к
	// ближайшему доминатору-«хозяину» — классу soldy, экземпляру или узлу Vue,
	// элементу DOM. Так весь вес делится без пересечений, как retained size
	const count = nodes.length / nf
	const first = new Uint32Array(count + 1)
	for (let i = 0; i < count; i++) first[i + 1] = first[i] + nodes[i * nf + iEdges]
	const strong = (k) => {
		const t = edgeTypes[edges[k * ef + eType]]
		return t !== 'weak' && t !== 'shortcut'
	}
	const post = new Int32Array(count).fill(-1)
	const order = new Int32Array(count)
	let p = 0
	{
		const stack = new Int32Array(count)
		const cursor = new Uint32Array(count)
		const seen = new Uint8Array(count)
		let sp = 0
		stack[sp++] = 0
		seen[0] = 1
		cursor[0] = first[0]
		while (sp) {
			const v = stack[sp - 1]
			if (cursor[v] < first[v + 1]) {
				const k = cursor[v]++
				if (!strong(k)) continue
				const w = edges[k * ef + iTo] / nf
				if (seen[w]) continue
				seen[w] = 1
				cursor[w] = first[w]
				stack[sp++] = w
			} else {
				sp--
				post[v] = p
				order[p++] = v
			}
		}
	}
	const predFirst = new Uint32Array(count + 1)
	for (let v = 0; v < count; v++)
		for (let k = first[v]; k < first[v + 1]; k++)
			if (strong(k)) predFirst[edges[k * ef + iTo] / nf + 1]++
	for (let i = 0; i < count; i++) predFirst[i + 1] += predFirst[i]
	const preds = new Int32Array(predFirst[count])
	{
		const fill = predFirst.slice()
		for (let v = 0; v < count; v++)
			for (let k = first[v]; k < first[v + 1]; k++)
				if (strong(k)) preds[fill[edges[k * ef + iTo] / nf]++] = v
	}
	const idom = new Int32Array(count).fill(-1)
	idom[0] = 0
	const reached = order.subarray(0, p)
	const intersect = (a, b) => {
		while (a !== b) {
			while (post[a] < post[b]) a = idom[a]
			while (post[b] < post[a]) b = idom[b]
		}
		return a
	}
	for (let changed = true; changed; ) {
		changed = false
		for (let i = reached.length - 1; i >= 0; i--) {
			const v = reached[i]
			if (v === 0 || post[v] < 0) continue
			let d = -1
			for (let k = predFirst[v]; k < predFirst[v + 1]; k++) {
				const u = preds[k]
				if (post[u] < 0 || idom[u] === -1) continue
				d = d === -1 ? u : intersect(u, d)
			}
			if (d !== -1 && idom[v] !== d) {
				idom[v] = d
				changed = true
			}
		}
	}
	const host = (name) =>
		/^T[A-Z]\w*(\$\d+)?$/.test(name) ||
		/^(Dep|Link|ReactiveEffect|RefImpl|ComputedRefImpl|EffectScope)$/.test(name) ||
		name.startsWith('{uid,vnode,') ||
		name.startsWith('{__v_isVNode') ||
		(name.startsWith('(native) <') && !name.startsWith('(native) <html'))
	const hostOf = new Int32Array(count).fill(-2)
	const findHost = (v) => {
		const path = []
		let h = -1
		while (v > 0 && post[v] >= 0) {
			if (hostOf[v] !== -2) {
				h = hostOf[v]
				break
			}
			path.push(v)
			if (host(names[v])) {
				h = v
				break
			}
			v = idom[v]
		}
		for (const p of path) hostOf[p] = h
		return h
	}
	const hostKey = (h) =>
		h < 0 ? '(вне хозяев)' : names[h].startsWith('(native) <') ? '(DOM-элемент)' : names[h]
	for (let i = 0; i < count; i++) {
		if (post[i] < 0) continue
		const nt = nodeTypes[nodes[i * nf + iType]]
		if (nt === 'native' && !names[i].startsWith('(native) system')) continue
		let h = findHost(i)
		let shared = ''
		// Общий узел (его держат двое, доминатор выше хозяев) — к хозяину
		// первого держателя: приблизительно, помечено «~»
		if (h < 0) {
			let o = owner[i]
			for (let hops = 0; o > 0 && hops < 12; hops++, o = owner[o]) {
				if (host(names[o])) {
					h = o
					shared = '~ '
					break
				}
			}
		}
		const key = '# ' + shared + hostKey(h)
		const g = out.get(key) ?? { size: 0, count: 0 }
		g.size += nodes[i * nf + iSize]
		if (h === i) g.count++
		out.set(key, g)
		const inner = '% ' + shared + hostKey(h) + ' :: ' + names[i]
		const gi = out.get(inner) ?? { size: 0, count: 0 }
		gi.size += nodes[i * nf + iSize]
		gi.count++
		out.set(inner, gi)
	}
	out.set('__JS__', { size: jsSize, count: 0 })
	for (const [k, v] of byOwner) out.set('@ ' + k, v)
	return out
}

const before = await snapshot()
await page.evaluate((n) => bench.render(n), N)
const after = await snapshot()
await browser.close()
server.close()

const diff = [...after].map(([name, a]) => {
	const b = before.get(name) ?? { size: 0, count: 0 }
	return { name, size: a.size - b.size, count: a.count - b.count }
})
const total = diff
	.filter((d) => !d.name.startsWith('@ ') && d.name !== '__JS__')
	.reduce((s, d) => s + d.size, 0)
const js = diff.find((d) => d.name === '__JS__')?.size ?? 0
const kb = (x) => (x / N / 1024).toFixed(2)
console.log(
	`\nN=${N}, mode=${MODE}: +${(total / 1048576).toFixed(1)} МБ, ${kb(total)} КБ на строку\n`,
)
console.log(`JS-куча: +${(js / 1048576).toFixed(1)} МБ, ${kb(js)} КБ на строку\n`)
console.log('КБ/стр  шт/стр  группа')
const show = (list) =>
	list
		.sort((x, y) => y.size - x.size)
		.slice(0, TOP)
		.forEach((d) =>
			console.log(
				kb(d.size).padStart(6),
				(d.count / N).toFixed(1).padStart(7),
				' ',
				d.name.slice(0, 130),
			),
		)
const plain = (d) => !/^[@#%] /.test(d.name) && d.name !== '__JS__'
show(diff.filter((d) => plain(d) && !d.name.startsWith('(native) blink')))
console.log('\nВнутренние узлы по первому владельцу')
show(diff.filter((d) => d.name.startsWith('@ ')))
console.log('\nJS-куча по ближайшему хозяину-доминатору (шт/стр — число хозяев)')
show(diff.filter((d) => d.name.startsWith('# ')))
console.log('\nСостав хозяев (хозяин :: узел)')
show(diff.filter((d) => d.name.startsWith('% ')))
