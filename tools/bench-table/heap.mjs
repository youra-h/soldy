import { chromium } from 'playwright'
import { build } from 'vite'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { urlOf } from './pages.mjs'
import { group } from './heap-group.mjs'

/**
 * Снимок кучи: что прибавляют N строк таблицы soldy. Два снимка на одной
 * странице — пустая таблица и N строк, — разница по группам делится на N.
 * Группа — конструктор объекта, имя функции замыкания или тип узла; у
 * простых объектов (`Object`) имени нет, и группой служит набор их свойств.
 *
 *   npm run heap -- 500 multiple        # строк, режим выбора[, сколько групп показать]
 *   npm run heap -- 500 none
 *   npm run heap -- 5000 multiple 45 scroll
 *   npm run heap -- 5000 unmount soldy+fit=contain+track 1  # строк, участник, замен[, пауза, мс[, групп]]
 *   npm run heap -- 5000 unmount react:soldy+fit=contain+track 5 2000
 *   npm run heap -- 500 mounted react:soldy+fit=contain+track 2  # то же, без размонтирования
 *
 * `scroll` — режим окна (`virtual`): первый снимок — после рендера, второй —
 * после прохода прокруткой по всем строкам. Разница — то, что прокрученные
 * строки оставили в памяти, и делится она так же на N.
 *
 * `unmount` — что пережило размонтирование. Участник — запись `run.mjs`
 * (флаги через «+», React — с префиксом «react:»). Первый снимок — пустая
 * страница до рендера, второй — после сценария `run.mjs` до `bench.clear()`
 * включительно и паузы после него. Замен данных (`bench.replace`) перед
 * размонтированием — k: первая с тем же зерном, что у `run.mjs` (7), каждая
 * следующая — со следующим. Сверх разницы по группам — пережившие: классы
 * soldy (`T…`) и записи строк, штук на строку, и на каждый — кратчайшая
 * цепочка удерживающих от корня по сильным рёбрам.
 *
 * `mounted` — что держит смонтированная таблица после замен. Участник и k —
 * как у `unmount`, сценарий тот же без `bench.clear()`, пауза — после
 * последней замены. Сверх разницы по группам — живые записи строк, штук на
 * строку, разложенные по наборам (`recordSets`), и на каждый набор —
 * кратчайшая цепочка удерживающих от корня до первой его записи.
 */
const N = Number(process.argv[2] ?? 500)
// Режимы со сценарием `run.mjs`: что пережило размонтирование и что держит смонтированная таблица
const SCENARIO = ['unmount', 'mounted'].includes(process.argv[3]) ? process.argv[3] : undefined
const UNMOUNT = SCENARIO === 'unmount'
const MOUNTED = SCENARIO === 'mounted'
const MODE = SCENARIO ? undefined : (process.argv[3] ?? 'multiple')
const LIB = SCENARIO ? (process.argv[4] ?? 'soldy') : undefined
const REPLACES = SCENARIO ? Number(process.argv[5] ?? 1) : 0
const PAUSE = SCENARIO ? Number(process.argv[6] ?? 0) : 0
const TOP = Number(process.argv[SCENARIO ? 7 : 4] ?? 45)
const SCROLL = !SCENARIO && process.argv[5] === 'scroll'
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
page.on('pageerror', (e) => console.error('pageerror', e.message))
await page.goto(
	`http://127.0.0.1:${server.address().port}/` +
		(SCENARIO ? urlOf(LIB) : `?lib=soldy&mode=${MODE}${SCROLL ? '&virtual=1' : ''}`),
)
await page.waitForFunction(() => 'bench' in window)
const cdp = await page.context().newCDPSession(page)

async function snapshot() {
	await page.evaluate(() => gc())
	const chunks = []
	const onChunk = (e) => chunks.push(e.chunk)
	cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk)
	await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
	cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk)
	return JSON.parse(chunks.join(''))
}

/**
 * Сценарий `run.mjs` до размонтирования включительно — те же шаги тем же
 * порядком, без замеров; замен данных — `REPLACES`, после размонтирования —
 * пауза `PAUSE`. В режиме `mounted` таблица не размонтируется, и пауза идёт
 * после последней замены.
 */
async function scenario() {
	const b = (fn, arg) => page.evaluate(fn, arg)

	await b((n) => bench.render(n), N)

	if (!LIB.includes('mode=none')) {
		await b(() => bench.selectAll())
		await b(() => bench.selectAll())
	}

	await b(() => bench.sort())
	await b(() => bench.sort())

	if (LIB.includes('+reorder')) {
		await b(() => bench.take())
		await b(() => bench.step())
		await b(() => bench.release())
	}

	if (LIB.includes('+resize')) {
		await b(() => bench.resize.grab())
		for (let step = 1; step <= 5; step++) await b((dx) => bench.resize.drag(dx), step * 20)
		await b(() => bench.resize.drop(100))
	}

	if (LIB.includes('+virtual')) await b(() => bench.scrollThrough())

	for (let i = 0; i < REPLACES; i++) await b(([n, seed]) => bench.replace(n, seed), [N, 7 + i])

	if (UNMOUNT) await b(() => bench.clear())

	if (PAUSE) await page.waitForTimeout(PAUSE)
}

/** Поля записи строки `makeRows`: ключ и колонки `COLUMNS` (`libs/data.ts`). */
const RECORD_FIELDS = ['id', 'name', ...Array.from({ length: 19 }, (_, i) => `c${i + 1}`)]

/**
 * Записи строк — простые объекты со всеми полями записи. По набору свойств, а
 * не по группе: объект с двадцатью одним свойством V8 может перевести в
 * словарь, и свойства в снимке идут у него в другом порядке.
 */
function recordsOf(snap) {
	const m = snap.snapshot.meta
	const nf = m.node_fields.length
	const ef = m.edge_fields.length
	const nodeTypes = m.node_types[0]
	const edgeTypes = m.edge_types[0]
	const [iType, iName, iEdges] = ['type', 'name', 'edge_count'].map((k) =>
		m.node_fields.indexOf(k),
	)
	const [eType, eName] = ['type', 'name_or_index'].map((k) => m.edge_fields.indexOf(k))
	const { nodes, edges, strings } = snap
	const marks = new Uint8Array(nodes.length / nf)
	let count = 0
	let e = 0
	for (let n = 0; n < nodes.length; n += nf) {
		const edgeCount = nodes[n + iEdges]
		if (nodeTypes[nodes[n + iType]] === 'object' && strings[nodes[n + iName]] === 'Object') {
			const props = new Set()
			for (let k = 0; k < edgeCount; k++) {
				const at = e + k * ef
				if (edgeTypes[edges[at + eType]] === 'property')
					props.add(strings[edges[at + eName]])
			}
			if (RECORD_FIELDS.every((field) => props.has(field))) {
				marks[n / nf] = 1
				count++
			}
		}
		e += edgeCount * ef
	}
	return { marks, count }
}

/**
 * Кратчайшие пути от корня снимка — обходом в ширину по сильным рёбрам: для
 * каждого узла — откуда и каким ребром он достигнут впервые, и порядок обхода.
 * Ярлык (`shortcut`) держит только от корня: так корень снимка ссылается на
 * глобальные объекты страницы, остальные ярлыки дублируют настоящие пути.
 */
function shortestPaths(snap) {
	const m = snap.snapshot.meta
	const nf = m.node_fields.length
	const ef = m.edge_fields.length
	const edgeTypes = m.edge_types[0]
	const iEdges = m.node_fields.indexOf('edge_count')
	const [eType, eName, iTo] = ['type', 'name_or_index', 'to_node'].map((k) =>
		m.edge_fields.indexOf(k),
	)
	const { nodes, edges, strings } = snap
	const count = nodes.length / nf
	const first = new Uint32Array(count + 1)
	for (let i = 0; i < count; i++) first[i + 1] = first[i] + nodes[i * nf + iEdges]
	// Откуда и каким ребром узел достигнут впервые
	const from = new Int32Array(count).fill(-1)
	const via = new Int32Array(count).fill(-1)
	const queue = new Int32Array(count)
	let head = 0
	let tail = 0
	queue[tail++] = 0
	from[0] = 0
	while (head < tail) {
		const v = queue[head++]
		for (let k = first[v]; k < first[v + 1]; k++) {
			const t = edgeTypes[edges[k * ef + eType]]
			if (t === 'weak' || (t === 'shortcut' && v !== 0)) continue
			const w = edges[k * ef + iTo] / nf
			if (from[w] !== -1) continue
			from[w] = v
			via[w] = k
			queue[tail++] = w
		}
	}
	const edge = (k) => {
		const t = edgeTypes[edges[k * ef + eType]]
		const n = edges[k * ef + eName]
		if (t === 'element') return `[${n}]`
		if (t === 'hidden') return `[hidden ${n}]`
		if (t === 'context') return `::${strings[n]}`
		if (t === 'internal') return `<${strings[n]}>`
		if (t === 'shortcut') return '(shortcut)'
		return `.${strings[n]}`
	}
	return { from, via, edge, order: queue.subarray(0, tail) }
}

/** Цепочка удерживающих от корня до узла по кратчайшим путям, по звену на ребро. */
function chainOf(paths, names, node) {
	const chain = []
	for (let v = node; v !== 0; v = paths.from[v])
		chain.push(`${paths.edge(paths.via[v])} → ${names[v]}`)
	return chain.reverse()
}

/**
 * Кратчайшая цепочка удерживающих от корня снимка до ближайшего узла каждой
 * группы. Группу узла называет `keyOf`, чужой узел — `undefined`.
 */
function retainers(snap, names, keyOf) {
	const paths = shortestPaths(snap)
	const found = new Map()
	for (const v of paths.order) {
		const key = keyOf(v)
		if (key !== undefined && !found.has(key)) found.set(key, v)
	}
	return new Map([...found].map(([name, node]) => [name, chainOf(paths, names, node)]))
}

/** Звеньев у хвоста цепочки, по которому записи делятся на наборы. */
const TAIL = 4

/**
 * Записи строк по наборам. Набор — последние `TAIL` звеньев кратчайшей цепочки
 * удерживающих, номера элементов в них стёрты, и массив `Array` в хвосте, если
 * он есть: записи одного списка лежат в одном массиве — у каждого держателя
 * свой, — а записи, которые держат поштучно (снимок состояния строки), делятся
 * по виду цепочки, хоть путь от корня до каждой и свой. Отдаёт наборы по
 * убыванию числа записей, у каждого — полную цепочку первой записи, и сколько
 * записей сильными рёбрами не достигнуто.
 */
function recordSets(snap, names, records) {
	const paths = shortestPaths(snap)
	const sets = new Map()
	let reached = 0
	for (const v of paths.order) {
		if (!records.marks[v]) continue
		reached++
		const tail = []
		let list = -1
		for (let u = v; u !== 0 && tail.length < TAIL; u = paths.from[u]) {
			tail.push(
				`${paths.edge(paths.via[u])} → ${names[u]}`.replace(/^\[(hidden )?\d+\]/, '[$1#]'),
			)
			if (list === -1 && names[u] === 'Array') list = u
		}
		const key = `${list}\n${tail.join('\n')}`
		const set = sets.get(key) ?? { count: 0, chain: chainOf(paths, names, v) }
		set.count++
		sets.set(key, set)
	}
	return {
		sets: [...sets.values()].sort((x, y) => y.count - x.count),
		unreached: records.count - reached,
	}
}

if (SCROLL) await page.evaluate((n) => bench.render(n), N)
const first = await snapshot()
const before = group(first).groups
// Записей строк на пустой странице нет, но разница — честнее
const recordsBefore = SCENARIO ? recordsOf(first).count : 0
if (SCENARIO) await scenario()
else
	await page.evaluate(
		([n, scroll]) => (scroll ? bench.scrollThrough() : bench.render(n)),
		[N, SCROLL],
	)
// Снимок после сценария нужен целиком — по нему ищутся цепочки
const raw = await snapshot()
const { groups: after, names } = group(raw)
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
const what = SCENARIO
	? `${LIB}${MOUNTED ? ', смонтирована' : ''}, замен ${REPLACES}, пауза ${PAUSE} мс`
	: `mode=${MODE}`
console.log(`\nN=${N}, ${what}: +${(total / 1048576).toFixed(1)} МБ, ${kb(total)} КБ на строку\n`)
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

if (UNMOUNT) {
	// Пережившие размонтирование: экземпляры классов soldy и записи строк
	const RECORD = '(запись строки)'
	const records = recordsOf(raw)
	const classes = diff.filter((d) => /^T[A-Z]\w*(\$\d+)?$/.test(d.name) && d.count > 0)
	const survived = [
		...(records.count > recordsBefore
			? [{ name: RECORD, count: records.count - recordsBefore }]
			: []),
		...classes,
	].sort((x, y) => y.count - x.count)
	const wanted = new Set(classes.map((d) => d.name))
	const chains = retainers(raw, names, (i) =>
		records.marks[i] ? RECORD : wanted.has(names[i]) ? names[i] : undefined,
	)

	console.log('\nПережили размонтирование: классы soldy и записи строк')
	if (!survived.length) console.log('  нет')
	else console.log('     шт  шт/стр  группа')
	for (const d of survived)
		console.log(String(d.count).padStart(7), (d.count / N).toFixed(2).padStart(7), ' ', d.name)
	if (survived.length)
		console.log('\nКратчайшая цепочка удерживающих от корня — до ближайшего из группы')
	for (const d of survived) {
		console.log(`\n${d.name}`)
		for (const hop of chains.get(d.name) ?? ['(не достигнут сильными рёбрами)'])
			console.log('  ' + hop.slice(0, 160))
	}
}

if (MOUNTED) {
	// Живые записи строк смонтированной таблицы — по наборам
	const records = recordsOf(raw)
	const count = records.count - recordsBefore
	const { sets, unreached } = recordSets(raw, names, records)

	console.log(`\nЖивые записи строк: ${count} шт, ${(count / N).toFixed(2)} на строку`)
	console.log('\nНаборы записей — по кратчайшей цепочке удерживающих от корня')
	for (const set of sets) {
		console.log(`\n${set.count} шт, ${(set.count / N).toFixed(2)} на строку`)
		for (const hop of set.chain) console.log('  ' + hop.slice(0, 160))
	}
	if (unreached) console.log(`\nНе достигнуты сильными рёбрами: ${unreached} шт`)
}
