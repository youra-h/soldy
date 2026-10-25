import { chromium } from 'playwright'
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { serve } from './serve.mjs'

/**
 * Прогон страниц компонентов: вес страницы и утечки по циклам (см.
 * benchmarks/README.md, «Страницы компонентов»).
 *
 *   npm run bench                                  # все фреймворки, все страницы
 *   npm run bench -- --fw vue,react --pages button,select --cycles 10
 *
 * Фреймворк — свой браузер и своя страница. На странице два прохода:
 *
 * 1. **Страницы по одной.** Страница компонента — N копий одним корнем —
 *    монтируется, сценарий действует на первые `act` копий, язык меняется
 *    туда и обратно, страница снимается; так `warm + cycles` раз подряд. После
 *    каждого монтирования и каждого снятия — сборка мусора и замер. Первые
 *    `warm` циклов — разогрев (ленивые определения компонентов, кэши
 *    форматов, регистрация элементов), от их конца считается рост. Сверх
 *    компонентов — `all` (каждый компонент по разу, своим корнем) и `empty`
 *    (корень без компонентов — шум самого замера).
 * 2. **Обход.** Все страницы по очереди, `rounds` кругов, без перезагрузки:
 *    вес каждой страницы и пустая страница после неё — на каждом круге.
 * 3. **`leak`** — кнопки с подставной утечкой, циклами, как страницы: проверка,
 *    что замер её видит. Последней: то, что она держит, остаётся до конца.
 *
 * Счётчики страницы сверяются «осевшими»: после разогрева и после последнего
 * цикла замер ждёт `settle` мс. Таймер приложения держит снятое до своего
 * срабатывания — превью тостов меняет тост через 2 с, — и это не утечка;
 * утечка — то, что держится и после.
 *
 * Замер — после сборки мусора протоколом DevTools (`HeapProfiler.collectGarbage`
 * дважды): занятая куча, живые узлы DOM и слушатели событий (счётчики
 * `Performance.getMetrics` — узлы и слушатели, которые держит кто-то, считаются
 * и отсоединёнными) и живые экземпляры ядра — компоненты (`TComponent`) и шины
 * событий (`TEventEmitter`) — через `Runtime.queryObjects`.
 *
 * Итог — `results/<фреймворк>.json`; таблицы журнала из него собирает
 * `report.mjs`.
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'vue,react,svelte,solid,webc,angular' },
		pages: { type: 'string' },
		n: { type: 'string', default: '50' },
		act: { type: 'string', default: '10' },
		warm: { type: 'string', default: '2' },
		cycles: { type: 'string', default: '20' },
		rounds: { type: 'string', default: '3' },
		settle: { type: 'string', default: '6000' },
		'no-build': { type: 'boolean', default: false },
	},
})
const FRAMEWORKS = values.fw.split(',')
const N = Number(values.n)
const ACT = Number(values.act)
const WARM = Number(values.warm)
const CYCLES = Number(values.cycles)
const ROUNDS = Number(values.rounds)
const SETTLE = Number(values.settle)

if (!values['no-build']) {
	await build({ configFile: path.resolve(import.meta.dirname, 'vite.config.ts') })
}

const { server, base } = serve()
const out = path.resolve(import.meta.dirname, 'results')

fs.mkdirSync(out, { recursive: true })

/** Наклон прямой по точкам — рост за цикл, методом наименьших квадратов. */
function slope(points) {
	const n = points.length

	if (n < 2) return 0

	const mx = (n - 1) / 2
	const my = points.reduce((sum, y) => sum + y, 0) / n
	let num = 0
	let den = 0

	points.forEach((y, x) => {
		num += (x - mx) * (y - my)
		den += (x - mx) ** 2
	})

	return num / den
}

async function measureFramework(fw) {
	const browser = await chromium.launch()
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
	const errors = []

	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`)
	})
	await page.goto(base + '?fw=' + fw)
	await page.waitForFunction(() => 'bench' in window, null, { timeout: 120_000 })

	const cdp = await page.context().newCDPSession(page)

	await cdp.send('Performance.enable')

	/** Живые объекты с прототипом из `bench.prototypes` — и его наследники. */
	async function alive(name) {
		const group = 'bench-count'
		const { result } = await cdp.send('Runtime.evaluate', {
			expression: `bench.prototypes.${name}`,
			objectGroup: group,
		})
		const { objects } = await cdp.send('Runtime.queryObjects', {
			prototypeObjectId: result.objectId,
			objectGroup: group,
		})
		const { result: length } = await cdp.send('Runtime.callFunctionOn', {
			objectId: objects.objectId,
			functionDeclaration: 'function () { return this.length }',
			returnByValue: true,
		})

		await cdp.send('Runtime.releaseObjectGroup', { objectGroup: group })

		return length.value
	}

	async function measure() {
		await cdp.send('HeapProfiler.collectGarbage')
		await cdp.send('HeapProfiler.collectGarbage')

		const { metrics } = await cdp.send('Performance.getMetrics')
		const metric = (name) => metrics.find((m) => m.name === name)?.value ?? NaN

		return {
			heap: metric('JSHeapUsedSize'),
			nodes: metric('Nodes'),
			listeners: metric('JSEventListeners'),
			components: await alive('component'),
			emitters: await alive('emitter'),
		}
	}

	const evaluate = (fn, arg) => page.evaluate(fn, arg)
	const all = await evaluate(() => bench.pages)
	const pages = values.pages ? values.pages.split(',') : [...all, 'all', 'empty']
	const result = {
		framework: fw,
		browser: browser.version(),
		date: new Date().toISOString(),
		n: N,
		act: ACT,
		warm: WARM,
		cycles: CYCLES,
		rounds: ROUNDS,
		settle: SETTLE,
		pages: {},
		tour: null,
		errors,
	}
	const start = await measure()

	result.start = start

	/** Замер после паузы: таймеры приложения, которые держат снятое, отработали. */
	async function settled() {
		await page.waitForTimeout(SETTLE)

		return measure()
	}

	/** Страница циклами: веса, замеры после снятия и осевшие — после разогрева и в конце. */
	async function cyclesOf(id) {
		const cycles = []
		let before = await measure()
		let base = before

		for (let cycle = 0; cycle < WARM + CYCLES; cycle++) {
			const time = await evaluate(([p, n]) => bench.mount(p, n), [id, N])
			const mounted = await measure()
			const actions = await evaluate(([p, act]) => bench.scenario(p, act), [id, ACT])

			await evaluate(() => bench.locale())
			await evaluate(() => bench.unmount())

			const after = await measure()

			cycles.push({ time, actions, before, mounted, after })
			before = after

			if (cycle === WARM - 1) {
				base = await settled()
				before = base
			}
		}

		result.pages[id] = { cycles, base, end: await settled(), errors: errors.length }
		console.log(fw, id, summary(result.pages[id]))
	}

	for (const id of pages) await cyclesOf(id)

	// Обход: все страницы подряд, кругами, — что копится от смены компонентов
	if (!values.pages) {
		const rounds = []

		for (let round = 0; round < ROUNDS; round++) {
			const visits = {}

			for (const id of all) {
				const before = await measure()

				await evaluate(([p, n]) => bench.mount(p, n), [id, N])

				const mounted = await measure()

				await evaluate(([p, act]) => bench.scenario(p, act), [id, ACT])
				await evaluate(() => bench.locale())
				await evaluate(() => bench.unmount())
				visits[id] = { before, mounted, after: await measure() }
			}

			rounds.push(visits)
			console.log(fw, `обход ${round + 1}`, JSON.stringify(await measure()))
		}

		result.tour = rounds
		await cyclesOf('leak')
	}

	result.end = await measure()
	await browser.close()
	fs.writeFileSync(path.join(out, `${fw}.json`), JSON.stringify(result, null, '\t'))

	return result
}

/** Строка журнала прогона: вес первой страницы и рост за циклы после разогрева — осевший. */
function summary({ cycles, base, end: last }) {
	const measured = cycles.slice(WARM)
	const kb = (x) => Math.round(x / 1024)

	return JSON.stringify({
		weightKB: kb(measured[0].mounted.heap - measured[0].before.heap),
		mountMs: Math.round(measured[0].time),
		heapSlopeKB: Math.round(slope(measured.map((c) => c.after.heap)) / 102.4) / 10,
		nodes: last.nodes - base.nodes,
		listeners: last.listeners - base.listeners,
		components: last.components - base.components,
		emitters: last.emitters - base.emitters,
	})
}

for (const fw of FRAMEWORKS) {
	try {
		await measureFramework(fw)
	} catch (error) {
		console.error(fw, 'ошибка', error)
	}
}

server.close()
