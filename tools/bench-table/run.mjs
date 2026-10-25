import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { types, urlOf } from './pages.mjs'

const N = Number(process.argv[2] ?? 5000)
const RUNS = Number(process.argv[3] ?? 5)
// Библиотека с флагами через «+»: `soldy+virtual` — `?lib=soldy&virtual=1`,
// `soldy+mode=none+cols=5` — `?lib=soldy&mode=none&cols=5`
const LIBS = (process.argv[4] ?? 'plain,tanstack,reka,soldy,naive,prime').split(',')
const dist = path.resolve(import.meta.dirname, 'dist')
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
// Потолок участника: все его прогоны — не дольше 10 минут. Не уложился — итог
// `fail`, без цифр: таблица, которая меряется дольше, — уже провал, и soldy тоже.
// Страница закрывается посреди сценария, и прогон идёт к следующему участнику.
// `LIMIT_MIN` в окружении меняет потолок, минут
const LIMIT_MIN = Number(process.env.LIMIT_MIN ?? 10)
class TOverLimit extends Error {}

for (const lib of LIBS) {
	const results = {}
	const push = (k, v) => (results[k] ??= []).push(v)
	const deadline = Date.now() + LIMIT_MIN * 60_000
	let over = false
	// Сценарий, который бросил, — итог участника, а не конец прогона: снятые до него
	// цифры остаются, следующие прогоны участника не идут (страница после ошибки
	// уже не та), прогон переходит к следующему участнику
	let failed = null
	for (let run = 0; run < RUNS && !failed; run++) {
		const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
		page.on('pageerror', (e) => console.error(lib, 'pageerror', e.message))
		try {
			await page.goto(base + urlOf(lib))
			await page.waitForFunction(() => 'bench' in window)
			// Сценарий — наперегонки с потолком участника. Проигравший сценарий
			// отклоняется, когда страницу закроют, и его отказ уже никому не нужен
			const b = (fn, arg) => {
				const step = page.evaluate(fn, arg)
				let timer

				step.catch(() => {})

				return Promise.race([
					step,
					new Promise((_, reject) => {
						timer = setTimeout(() => reject(new TOverLimit()), deadline - Date.now())
					}),
				]).finally(() => clearTimeout(timer))
			}
			const heap = async () => (await b(() => (gc(), bench.info()))).heap
			// Куча после сборки вне стека. `gc()` из скрипта страницы оставляет живой
			// часть снятого — сколько, зависит от прогона, и повторный `gc()` её не
			// снимает: остаток держит стек вызова сборки, а не страница. Сборка
			// отдельной задачей (`execution: 'async'`) идёт с пустым стеком, и что
			// переживает её, держится на самом деле
			const unstacked = async () =>
				(
					await b(
						async () => (await gc({ type: 'major', execution: 'async' }), bench.info()),
					)
				).heap
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
			// С ручкой ширины (`resize`) — протяжка второй колонки: нажать, пять шагов
			// по 20 px (медиана шагов) и отпустить
			if (lib.includes('+resize')) {
				push('Взять ручку', await b(() => bench.resize.grab()))
				const steps = []
				for (let step = 1; step <= 5; step++)
					steps.push(await b((dx) => bench.resize.drag(dx), step * 20))
				const mid = (k) => [...steps.map((s) => s[k])].sort((x, y) => x - y)[2]
				push('Шаг ручки', { paint: mid('paint'), settled: mid('settled') })
				push('Отпустить ручку', await b(() => bench.resize.drop(100)))
			}
			// В режиме окна — проход по всем строкам и куча после: что прокрученные
			// строки оставили в памяти. После сортировок: пробы смотрят на верх таблицы
			if (lib.includes('+virtual')) {
				push('Прокрутка до конца', await b(() => bench.scrollThrough()))
				push('Память после прокрутки, МБ', MB((await heap()) - heap0))
			}
			push('Замена данных', await b((n) => bench.replace(n, 7), N))
			push('Размонтирование', await b(() => bench.clear()))
			push('Память после, МБ', MB((await heap()) - heap0))
			// И вне стека: утечку показывает только она
			push('Память после, сборка вне стека, МБ', MB((await unstacked()) - heap0))
			if (run === 0)
				console.log(
					lib,
					`строк ${i1.rows}, узлов ${i1.nodes}, отмечено ${i2.checked}→${i3.checked}, ↑ «${i4.first}», ↓ «${i5.first}»` +
						(i6 ? `, колонки «${i5.heads}» → «${i6.heads}»` : ''),
				)
		} catch (error) {
			over = error instanceof TOverLimit
			failed = over
				? `дольше ${LIMIT_MIN} мин`
				: `прогон ${run + 1}: ${String(error?.message ?? error).split('\n')[0]}`
			console.error(lib, 'ошибка', failed)
		}
		await page.close()
	}
	const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
	// Разброс прогонов — рядом с медианой, «(min–max)»; у времени — до успокоения
	const spread = (a) => `(${Math.min(...a)}–${Math.max(...a)})`
	table[lib] = Object.fromEntries(
		Object.entries(results).map(([k, v]) => {
			if (typeof v[0] === 'number') return [k, `${med(v)} ${spread(v)}`]

			const settled = v.map((x) => x.settled)

			return [k, `${med(v.map((x) => x.paint))} / ${med(settled)} ${spread(settled)}`]
		}),
	)
	if (over) table[lib] = { Итог: `fail: ${failed}` }
	else if (failed) table[lib]['Ошибка'] = failed
	// Строка участника — сразу: зависший следующий не съест уже снятые цифры
	console.log(lib, JSON.stringify(table[lib]))
}
await browser.close()
server.close()
console.log(
	`\nN=${N}, прогонов ${RUNS}, медиана (min–max); время — мс до кадра / до успокоения, разброс — до успокоения`,
)
console.table(table)
