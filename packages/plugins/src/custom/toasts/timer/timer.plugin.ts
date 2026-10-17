import type { IToasts, IToastsItem, TToastsCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { TCollectionBundlesPlugin } from '../../collection'
import type { IDomEventTarget } from '../../../utils'
import type { TToastCountdown, TToastsTimerPluginEvents } from './types'

/**
 * Сколько ждать, прежде чем снять паузу, когда указатель ушёл из региона, мс.
 *
 * Указатель берут только тосты: регион нажатий мимо них не ловит. Закрытый
 * тост указатель отпускает сразу, и уход с него — не уход пользователя:
 * сосед за ним через миг встанет на его место под тот же указатель. Без
 * задержки отсчёт остальных тостов дёргался бы на каждое закрытие под
 * указателем. Время — с запасом на смыкание соседей в теме.
 */
const RESUME_DELAY = 400

/**
 * TToastsTimerPlugin — отсчёт тостов: время вышло — тост закрывается.
 *
 * **Кого считает** — показанные открытые тосты (`batch.shown`) с длительностью
 * (`durationOf` расширения `toasts`): своя у тоста, иначе владельца. `0` —
 * тост держится, пока его не закроют, и отсчёта у него нет; так и у тоста,
 * который ждёт (`loading`), — это итог расширения, а не правило плагина.
 * Вытесненный за предел видимых тост ждёт места с оставшимся временем: время
 * идёт только у того, кого видно. Смена длительности (`item:duration`) — и
 * снятое ожидание тоже — начинает отсчёт заново.
 *
 * **Пауза — для всех разом**, пока указатель или фокус в регионе и пока
 * вкладка скрыта: читающий тост не должен исчезнуть у него из-под указателя, а
 * уведомление, пришедшее в скрытую вкладку, — истечь, пока его никто не видел.
 * Уход указателя снимает паузу с задержкой (`RESUME_DELAY`).
 *
 * Таймеры и слушатели — только пока есть узел региона: на сервере и до первой
 * отрисовки считать некому и показывать нечего. Узел ушёл — отсчёт стоит,
 * оставшееся время сохраняется.
 *
 * Время вышло — `close()` тоста: тот же путь, что крестик и Escape, а убирает
 * закрытый тост из коллекции плагин удаления, когда тот догаснет.
 */
export class TToastsTimerPlugin extends TBasePlugin<IToasts, TToastsTimerPluginEvents> {
	private _engine: TToastsCollection | null = null
	/** Узел региона; `null` — считать некому. */
	private _region: (IDomEventTarget & Node) | null = null
	private _document: Document | null = null
	private readonly _countdowns = new Map<IToastsItem, TToastCountdown>()
	/** Указатель над тостами. */
	private _hovered = false
	/** Фокус в регионе. */
	private _focused = false
	/** Вкладка скрыта. */
	private _hidden = false
	/** Отложенное снятие паузы после ухода указателя. */
	private _resumeTimer: ReturnType<typeof setTimeout> | null = null
	private readonly _sync = (): void => this._resync()

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => this._attach(node))
		element?.events.on('removed', () => this._detach())

		// Коллекция привязывается после install — ждём момент привязки
		ctx.get(TCollectionBundlesPlugin)?.events.on('engine:bound', (engine) =>
			this._bindEngine(engine),
		)
	}

	override destroy(): void {
		this._detach()

		for (const countdown of this._countdowns.values()) this._stop(countdown)

		this._countdowns.clear()
		this._engine = null

		super.destroy()
	}

	private _bindEngine(engine: TToastsCollection): void {
		this._engine = engine

		this._listenTo(engine.extensions.batch.events, 'change:shown', this._sync)
		this._listenTo(engine.extensions.toasts.events, 'item:close', (toast) => this._drop(toast))
		this._listenTo(engine.extensions.toasts.events, 'item:duration', (toast) =>
			this._restart(toast),
		)

		this._resync()
	}

	private _attach(node: Element): void {
		this._detach()

		const region: IDomEventTarget & Node = node
		const document = node.ownerDocument

		region.addEventListener('pointerenter', this._onPointerEnter)
		region.addEventListener('pointerleave', this._onPointerLeave)
		region.addEventListener('focusin', this._onFocusIn)
		region.addEventListener('focusout', this._onFocusOut)
		document.addEventListener('visibilitychange', this._onVisibilityChange)

		this._region = region
		this._document = document
		this._hidden = document.hidden
		this._focused = document.activeElement !== null && node.contains(document.activeElement)

		this._resync()
	}

	private _detach(): void {
		const region = this._region

		this._cancelResume()

		if (region) {
			region.removeEventListener('pointerenter', this._onPointerEnter)
			region.removeEventListener('pointerleave', this._onPointerLeave)
			region.removeEventListener('focusin', this._onFocusIn)
			region.removeEventListener('focusout', this._onFocusOut)
		}

		this._document?.removeEventListener('visibilitychange', this._onVisibilityChange)

		this._region = null
		this._document = null
		this._hovered = false
		this._focused = false
		this._hidden = false

		this._resync()
	}

	/** Отсчёт стоит: указатель или фокус в регионе, вкладка скрыта. */
	private get _paused(): boolean {
		return this._hovered || this._focused || this._hidden
	}

	/**
	 * Отсчёт идёт у показанных открытых тостов с длительностью, пока есть узел
	 * региона и нет паузы. Остальные стоят: тост ушёл из коллекции, закрыт или
	 * больше не закрывается сам — его отсчёт забыт; вытесненный за предел
	 * ждёт места с оставшимся временем.
	 */
	private _resync(): void {
		const engine = this._engine
		const counting = new Set<IToastsItem>()

		if (engine && this._region) {
			const running = !this._paused

			for (const toast of engine.extensions.batch.shown) {
				if (!toast.open) continue

				const duration = engine.extensions.toasts.durationOf(toast)

				if (duration <= 0) continue

				counting.add(toast)

				let countdown = this._countdowns.get(toast)

				if (!countdown) {
					countdown = { remaining: duration, started: null, timer: null }
					this._countdowns.set(toast, countdown)
				}

				if (running) {
					this._run(toast, countdown)
				} else {
					this._stop(countdown)
				}
			}
		}

		for (const [toast, countdown] of this._countdowns) {
			if (counting.has(toast)) continue

			this._stop(countdown)

			const waits =
				toast.open &&
				engine !== null &&
				engine.extensions.batch.items.includes(toast) &&
				engine.extensions.toasts.durationOf(toast) > 0

			if (!waits) this._countdowns.delete(toast)
		}
	}

	/** Длительность тоста сменилась — отсчёт заново, с новой длительности. */
	private _restart(toast: IToastsItem): void {
		this._drop(toast)
		this._resync()
	}

	/** Отсчёт тоста больше не нужен: тост закрыт или его длительность сменилась. */
	private _drop(toast: IToastsItem): void {
		const countdown = this._countdowns.get(toast)

		if (!countdown) return

		this._stop(countdown)
		this._countdowns.delete(toast)
	}

	private _run(toast: IToastsItem, countdown: TToastCountdown): void {
		if (countdown.timer !== null) return

		countdown.started = Date.now()
		countdown.timer = setTimeout(() => {
			countdown.timer = null
			this._countdowns.delete(toast)
			toast.close()
		}, countdown.remaining)
	}

	/** Остановить отсчёт и запомнить, сколько осталось. */
	private _stop(countdown: TToastCountdown): void {
		if (countdown.timer === null) return

		clearTimeout(countdown.timer)

		countdown.remaining = Math.max(
			0,
			countdown.remaining - (Date.now() - (countdown.started ?? 0)),
		)
		countdown.started = null
		countdown.timer = null
	}

	private readonly _onPointerEnter = (): void => {
		this._cancelResume()

		if (this._hovered) return

		this._hovered = true
		this._resync()
	}

	private readonly _onPointerLeave = (): void => {
		this._cancelResume()

		this._resumeTimer = setTimeout(() => {
			this._resumeTimer = null
			this._hovered = false
			this._resync()
		}, RESUME_DELAY)
	}

	private readonly _onFocusIn = (): void => {
		if (this._focused) return

		this._focused = true
		this._resync()
	}

	/** Фокус ушёл — пауза снимается, только если он ушёл из региона. */
	private readonly _onFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget
		const inside = next instanceof Node && this._region !== null && this._region.contains(next)

		if (inside || !this._focused) return

		this._focused = false
		this._resync()
	}

	private readonly _onVisibilityChange = (): void => {
		const hidden = this._document?.hidden ?? false

		if (hidden === this._hidden) return

		this._hidden = hidden
		this._resync()
	}

	private _cancelResume(): void {
		if (this._resumeTimer === null) return

		clearTimeout(this._resumeTimer)
		this._resumeTimer = null
	}
}
