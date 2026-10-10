import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const N = Number(process.argv[2] ?? 5000)
const RUNS = Number(process.argv[3] ?? 5)
// Библиотека с флагами через «+»: `soldy+virtual` — `?lib=soldy&virtual=1`,
// `soldy+mode=none+cols=5` — `?lib=soldy&mode=none&cols=5`
const LIBS = (process.argv[4] ?? 'plain,tanstack,reka,soldy,naive,prime').split(',')
const urlOf = (lib) => {
	const [name, ...flags] = lib.split('+')

	return (
		'?lib=' + name + flags.map((flag) => `&${flag.includes('=') ? flag : flag + '=1'}`).join('')
	)
}
const dist = path.resolve(import.meta.dirname, 'dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = http
	.createServer((req, res) => {
		const p = req.url.split('?')[0]
		const f = path.join(dist, p === '/' ? 'index.html' : p)
		if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end()
		res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' })
		fs.createReadStream(f).pipe(res)
	})
	.listen(0)
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch({
	args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
})
const MB = (x) => Math.round(x / 1e5) / 10
const table = {}

for (const lib of LIBS) {
	const results = {}
	const push = (k, v) => (results[k] ??= []).push(v)
	for (let run = 0; run < RUNS; run++) {
		const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
		page.on('pageerror', (e) => console.error(lib, 'pageerror', e.message))
		await page.goto(base + urlOf(lib))
		await page.waitForFunction(() => 'bench' in window)
		const b = (fn, arg) => page.evaluate(fn, arg)
		const heap = async () => (await b(() => (gc(), bench.info()))).heap
		const heap0 = await heap()
		push('Рендер', await b((n) => bench.render(n), N))
		const i1 = await b(() => bench.info())
		push('Память, МБ', MB((await heap()) - heap0))
		// Без выбора (`mode=none`) чекбокса «выбрать все» нет
		const selecting = !lib.includes('mode=none')
		if (selecting) push('Выделить все', await b(() => bench.selectAll()))
		const i2 = await b(() => bench.info())
		if (selecting) push('Снять выделение', await b(() => bench.selectAll()))
		const i3 = await b(() => bench.info())
		push('Сортировка ↑', await b(() => bench.sort()))
		const i4 = await b(() => bench.info())
		push('Сортировка ↓', await b(() => bench.sort()))
		const i5 = await b(() => bench.info())
		// С перестановкой (`reorder`) — жест по заголовку второй колонки: взять,
		// шаг на соседа, отпустить. После сортировок: окно — у верха таблицы
		const reordering = lib.includes('+reorder')
		if (reordering) {
			push('Взять колонку', await b(() => bench.take()))
			push('Смена места', await b(() => bench.step()))
			push('Отпустить', await b(() => bench.release()))
		}
		const i6 = reordering ? await b(() => bench.info()) : undefined
		// В режиме окна — проход по всем строкам и куча после: что прокрученные
		// строки оставили в памяти. После сортировок: пробы смотрят на верх таблицы
		if (lib.includes('+virtual')) {
			push('Прокрутка до конца', await b(() => bench.scrollThrough()))
			push('Память после прокрутки, МБ', MB((await heap()) - heap0))
		}
		push('Замена данных', await b((n) => bench.replace(n, 7), N))
		push('Размонтирование', await b(() => bench.clear()))
		push('Память после, МБ', MB((await heap()) - heap0))
		if (run === 0)
			console.log(
				lib,
				`строк ${i1.rows}, узлов ${i1.nodes}, отмечено ${i2.checked}→${i3.checked}, ↑ «${i4.first}», ↓ «${i5.first}»` +
					(i6 ? `, колонки «${i5.heads}» → «${i6.heads}»` : ''),
			)
		await page.close()
	}
	const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
	table[lib] = Object.fromEntries(
		Object.entries(results).map(([k, v]) => [
			k,
			typeof v[0] === 'number'
				? med(v)
				: `${med(v.map((x) => x.paint))} / ${med(v.map((x) => x.settled))}`,
		]),
	)
}
await browser.close()
server.close()
console.log(`\nN=${N}, прогонов ${RUNS}, медиана; время — мс до кадра / до успокоения`)
console.table(table)
