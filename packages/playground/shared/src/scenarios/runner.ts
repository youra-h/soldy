import { createInstance, type TInstance } from '../instance'
import { findComponent } from '../registry'
import { TScenarioJournal, printToConsole, type TPrint } from './journal'
import type {
	IScenarioContext,
	IScenarioHost,
	TScenario,
	TScenarioCheck,
	TScenarioState,
	TScenarioSummary,
} from './types'

/** Сколько автоматическому сценарию можно идти целиком, мс. */
export const AUTO_TIMEOUT = 5000

/** Как часто `until` перепроверяет условие, мс. */
const POLL_INTERVAL = 16

const IDLE: TScenarioState = { status: 'idle', checks: [] }

export type TScenarioRunnerOptions = {
	host: IScenarioHost
	scenarios: readonly TScenario[]
	/** Экземпляр для сценария. По умолчанию — по записи реестра. */
	create?: (scenario: TScenario) => TInstance
	/** Лимит автоматического сценария целиком, мс. У ручного лимита нет. */
	timeout?: number
	print?: TPrint
}

/** Прогон одного сценария. */
type TRun = {
	controller: AbortController
	journal: TScenarioJournal
	instance: TInstance | null
	/**
	 * Итог уже поставлен: самим прогоном, отметкой человека или отменой.
	 * Всё, что прогон пришлёт после, статус не меняет.
	 */
	settled: boolean
	/** Чего прогон ждёт сейчас — для текста ошибки по лимиту. */
	waiting?: string
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/** Промис, который обрывается отменой прогона. */
function abortable<T>(value: PromiseLike<T> | T, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason)

	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(signal.reason)

		signal.addEventListener('abort', onAbort, { once: true })

		Promise.resolve(value).then(
			(result) => {
				signal.removeEventListener('abort', onAbort)
				resolve(result)
			},
			(error: unknown) => {
				signal.removeEventListener('abort', onAbort)
				reject(error)
			},
		)
	})
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined

	return abortable(
		new Promise<void>((resolve) => {
			timer = setTimeout(resolve, ms)
		}),
		signal,
	).finally(() => clearTimeout(timer))
}

/** Промис с наружным `resolve`: `Promise.withResolvers` в целевой lib ещё нет. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve: () => void = () => {}
	const promise = new Promise<void>((done) => {
		resolve = done
	})

	return { promise, resolve }
}

function defaultCreate(scenario: TScenario): TInstance {
	const entry = findComponent(scenario.component)

	if (!entry) {
		throw new Error(`компонента «${scenario.component}» нет в реестре стенда`)
	}

	return createInstance(entry)
}

/**
 * Сводка по сценариям: автоматические — прошли и упали, ручные — ещё и ждут.
 *
 * Чистая функция от снимка состояний, а не метод раннера: стенду фреймворка
 * нужна сводка от его реактивного снимка, иначе она не пересчитается.
 */
export function summarize(
	scenarios: readonly TScenario[],
	states: Readonly<Record<string, TScenarioState>>,
): TScenarioSummary {
	const summary: TScenarioSummary = {
		auto: { total: 0, passed: 0, failed: 0 },
		manual: { total: 0, passed: 0, waiting: 0, failed: 0 },
		failed: 0,
		passed: false,
	}

	for (const scenario of scenarios) {
		const status = states[scenario.id]?.status ?? 'idle'
		const group = scenario.kind === 'auto' ? summary.auto : summary.manual

		group.total++

		if (status === 'passed') group.passed++
		if (status === 'failed') group.failed++
		if (status === 'waiting') summary.manual.waiting++
	}

	const total = summary.auto.total + summary.manual.total

	summary.failed = summary.auto.failed + summary.manual.failed
	summary.passed = total > 0 && summary.auto.passed + summary.manual.passed === total

	return summary
}

/**
 * Раннер сценариев — без фреймворка.
 *
 * Монтирование отдано хосту (`IScenarioHost`), всё остальное общее для стендов
 * всех фреймворков: жизненный цикл прогона, журнал, проверки, лимиты, сводка.
 *
 * - Перезапуск отменяет прежний прогон, снимает его сцену, уничтожает
 *   экземпляр и заводит новый журнал. Запоздавший результат отменённого
 *   прогона статус не меняет.
 * - Автоматический сценарий обязан уложиться в `timeout` целиком — иначе
 *   сломанный сценарий «выполнялся» бы вечно. Ручной ждёт человека сколько
 *   угодно.
 * - Законченный прогон сцену не снимает: на результат смотрят глазами.
 *   Снимает её перезапуск или `release`.
 */
export class TScenarioRunner {
	private readonly _host: IScenarioHost
	private readonly _scenarios: ReadonlyMap<string, TScenario>
	private readonly _create: (scenario: TScenario) => TInstance
	private readonly _timeout: number
	private readonly _print: TPrint

	private readonly _states = new Map<string, TScenarioState>()
	private readonly _runs = new Map<string, TRun>()
	private readonly _listeners = new Set<() => void>()

	/** Номер текущего `runAll`: новый запуск или `release` обрывают прежний. */
	private _batch = 0

	constructor(options: TScenarioRunnerOptions) {
		this._host = options.host
		this._scenarios = new Map(options.scenarios.map((scenario) => [scenario.id, scenario]))
		this._create = options.create ?? defaultCreate
		this._timeout = options.timeout ?? AUTO_TIMEOUT
		this._print = options.print ?? printToConsole
	}

	state(id: string): TScenarioState {
		return this._states.get(id) ?? IDLE
	}

	/** Состояния всех сценариев — новым объектом на каждый вызов. */
	snapshot(): Readonly<Record<string, TScenarioState>> {
		return Object.fromEntries([...this._scenarios.keys()].map((id) => [id, this.state(id)]))
	}

	/** Подписка на любое изменение состояний. Возвращает отписку. */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener)

		return () => this._listeners.delete(listener)
	}

	/** Запустить сценарий. Разрешается, когда прогон закончен или отменён. */
	run(id: string): Promise<void> {
		return this._start(id).done
	}

	/**
	 * Автоматические — строго по очереди: сцены у блоков свои, но фокус и
	 * консоль на странице одни, и параллельные прогоны мешали бы друг другу.
	 * Потом ручные — все сразу: они ждут человека, и разрешается `runAll`,
	 * когда каждый из них готов и ждёт.
	 */
	async runAll(ids: readonly string[]): Promise<void> {
		const batch = ++this._batch
		const scenarios = ids.map((id) => this._scenario(id))
		const autos = scenarios.filter((scenario) => scenario.kind === 'auto')

		// Прежние итоги сбрасываются сразу: сводка во время прогона иначе
		// показывала бы «всё прошло» по результатам прошлого раза
		for (const scenario of autos) {
			const current = this._runs.get(scenario.id)

			if (!current || current.settled) this._states.set(scenario.id, IDLE)
		}

		this._emit()

		for (const scenario of autos) {
			if (batch !== this._batch) return

			await this.run(scenario.id)
		}

		if (batch !== this._batch) return

		await Promise.all(
			scenarios
				.filter((scenario) => scenario.kind === 'manual')
				.map((scenario) => this._start(scenario.id).started),
		)
	}

	/**
	 * Итог ручного сценария, поставленный человеком. Снимает ожидание; сцена
	 * остаётся — на неё можно смотреть и дальше.
	 */
	mark(id: string, passed: boolean): void {
		const scenario = this._scenario(id)

		if (scenario.kind !== 'manual') {
			throw new Error(`[playground] ${id}: итог руками ставится только ручному сценарию`)
		}

		const run = this._runs.get(id)

		if (run && !run.settled) this._settle(run)

		this._states.set(id, {
			status: passed ? 'passed' : 'failed',
			checks: this.state(id).checks,
			marked: true,
		})
		this._print(`[${id}] ${passed ? '✓ засчитан' : '✗ отклонён'} руками`)
		this._emit()
	}

	/**
	 * Уход со страницы: сцены снимаются, экземпляры уничтожаются. Незаконченные
	 * прогоны отменяются и возвращаются в `idle`, законченные сохраняют итог.
	 */
	release(ids: readonly string[]): void {
		this._batch++

		for (const id of ids) {
			const run = this._runs.get(id)

			if (!run) continue

			this._runs.delete(id)

			if (!run.settled) {
				this._settle(run)
				this._states.set(id, IDLE)
				this._print(`[${id}] отменён`)
			}

			void this._teardown(id, run)
		}

		this._emit()
	}

	summary(ids: readonly string[]): TScenarioSummary {
		return summarize(
			ids.map((id) => this._scenario(id)),
			this.snapshot(),
		)
	}

	private _scenario(id: string): TScenario {
		const scenario = this._scenarios.get(id)

		if (!scenario) throw new Error(`[playground] сценария «${id}» нет`)

		return scenario
	}

	private _emit(): void {
		for (const listener of this._listeners) listener()
	}

	private _settle(run: TRun): void {
		run.settled = true
		run.controller.abort(new Error('прогон отменён'))
	}

	/** Сцена снимается раньше экземпляра: фреймворк отписывается от живого. */
	private async _teardown(id: string, run: TRun): Promise<void> {
		await this._host.unmount(id)

		run.instance?.destroy?.()
		run.instance = null
	}

	/** Промежуточное состояние — пока прогон текущий и не закончен. */
	private _update(id: string, run: TRun, state: TScenarioState): void {
		if (run.settled || this._runs.get(id) !== run) return

		this._states.set(id, state)
		this._emit()
	}

	/** Итог прогона — только если его ещё никто не поставил. */
	private _settleWith(id: string, run: TRun, state: TScenarioState): void {
		if (run.settled) return

		run.settled = true
		this._states.set(id, state)
		this._emit()

		const failure = state.error ?? state.checks.find((check) => !check.ok)?.text

		this._print(
			`[${id}] ${state.status === 'passed' ? '✓ прошёл' : `✗ упал: ${failure ?? ''}`}`,
		)
	}

	private _start(id: string): { started: Promise<void>; done: Promise<void> } {
		const scenario = this._scenario(id)
		const previous = this._runs.get(id)
		const run: TRun = {
			controller: new AbortController(),
			journal: new TScenarioJournal(id, this._print),
			instance: null,
			settled: false,
		}

		this._runs.set(id, run)

		if (previous && !previous.settled) this._settle(previous)

		this._states.set(id, { status: 'running', checks: [] })
		this._emit()

		const started = deferred()
		const done = this._execute(scenario, run, previous, started.resolve)

		return { started: started.promise, done }
	}

	private async _execute(
		scenario: TScenario,
		run: TRun,
		previous: TRun | undefined,
		markStarted: () => void,
	): Promise<void> {
		const { id } = scenario
		const { signal } = run.controller
		const checks: TScenarioCheck[] = []

		const timer =
			scenario.kind === 'auto'
				? setTimeout(() => {
						const limit = `${this._timeout} мс`

						run.controller.abort(
							new Error(
								run.waiting
									? `не дождались за ${limit}: ${run.waiting}`
									: `не уложился в ${limit}`,
							),
						)
					}, this._timeout)
				: undefined

		this._print(`[${id}] ▶ ${scenario.title}`)

		try {
			if (previous) await abortable(this._teardown(id, previous), signal)

			run.instance = this._create(scenario)

			const scene = await abortable(
				this._host.mount({ scenario, instance: run.instance, journal: run.journal }),
				signal,
			)

			// Ширину сцене мог задать прежний прогон или человек мышью —
			// новый стартует с чистой
			scene.style.removeProperty('width')

			if (scenario.kind === 'manual') {
				this._update(id, run, { status: 'waiting', checks: [...checks] })
				this._print(`[${id}] ⏳ ждёт человека`)
			}

			markStarted()

			const ctx = this._context(id, run, run.instance, scene, checks)

			// Ручной без `run` ждёт только отметки человека — она его и отменит
			await abortable(scenario.run ? scenario.run(ctx) : new Promise<never>(() => {}), signal)

			this._settleWith(id, run, {
				status: checks.every((check) => check.ok) ? 'passed' : 'failed',
				checks: [...checks],
			})
		} catch (error) {
			this._settleWith(id, run, {
				status: 'failed',
				checks: [...checks],
				error: describeError(error),
			})
		} finally {
			clearTimeout(timer)
			markStarted()

			// Конец прогона снимает и нативные слушатели, повешенные с `{ signal }`
			if (!signal.aborted) run.controller.abort(new Error('прогон закончен'))
		}
	}

	private _context(
		id: string,
		run: TRun,
		instance: TInstance,
		scene: HTMLElement,
		checks: TScenarioCheck[],
	): IScenarioContext {
		const { signal } = run.controller
		const { journal } = run

		const until = async (condition: () => boolean, what: string): Promise<void> => {
			run.waiting = what

			try {
				while (!condition()) await sleep(POLL_INTERVAL, signal)
			} finally {
				run.waiting = undefined
			}
		}

		return {
			instance,
			scene,
			journal,
			signal,
			check: (ok, text) => {
				checks.push({ ok, text })
				this._update(id, run, { ...this.state(id), checks: [...checks] })

				if (!ok) this._print(`[${id}] ✗ ${text}`)

				return ok
			},
			frame: () =>
				abortable(
					new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
					signal,
				),
			pause: (ms) => sleep(ms, signal),
			until,
			events: (name, count = 1) =>
				until(() => journal.count(name) >= count, `${name} × ${count}`),
			resize: (width) => {
				if (width === null) scene.style.removeProperty('width')
				else scene.style.width = `${width}px`
			},
		}
	}
}
