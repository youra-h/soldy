import { frameDebounce } from '@soldy-ui/core'
import type { ITextarea } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { fieldOf } from '../../input/field'
import type { TTextareaAutoresizePluginEvents } from './types'

/** Число из вычисленного стиля в px; не число (`normal`) — 0. */
const px = (value: string): number => parseFloat(value) || 0

/**
 * Запомнить прокрутку предков поля перед замером; вернуть её — функция,
 * которую отдаёт вызов.
 *
 * Замер на миг сжимает поле до `rows`, и всё, что под ним, становится
 * короче. Прокрутку, упёртую в конец, браузер при этом прижимает к новому
 * концу, и после замера поле вставало на место, а страница уезжала вверх —
 * на каждую клавишу в поле у низа страницы. Chromium возвращает её сам
 * привязкой прокрутки (`overflow-anchor`), но без привязки — её выключило
 * приложение или её нет у браузера — страница уезжала бы. Сдвиги предков,
 * которые не изменились, возврат не трогает.
 */
function holdScroll(field: Element): () => void {
	const held: Array<readonly [Element, number]> = []

	for (let node = field.parentElement; node; node = node.parentElement) {
		if (node.scrollTop !== 0) held.push([node, node.scrollTop])
	}

	return () => {
		for (const [node, top] of held) {
			// Мгновенно: плавная прокрутка темы растянула бы возврат на кадры
			if (node.scrollTop !== top) node.scrollTo({ top, behavior: 'instant' })
		}
	}
}

/**
 * TTextareaAutoresizePlugin — высота многострочного поля по содержимому: от
 * `rows` до `maxRows` строк.
 *
 * Нативная `<textarea>` не растёт, поэтому авторост — флаг `autoresize`, а
 * пока он выключен, плагин поле не трогает: высоту дают `rows` и ручка.
 * Свойства лежат на инстансе (`ITextarea`), плагин их читает — так же, как
 * `TListHeightPlugin` читает `maxRows` списка: свойство — ядру, применение —
 * плагину.
 *
 * Высота — инлайновый `height` самой `<textarea>` (корень растёт за ней сам:
 * в нём ещё счётчик), в единицах её `box-sizing`. Строку меряет вычисленный
 * интерлиньяж поля, к строкам добавляются его поля и рамка по оси блока, а
 * высоту текста отдаёт `scrollHeight` — на миг сжатого до `rows` поля без
 * прокрутки: так текст переносится по всей ширине, как после замера.
 * Прокрутку предков, которую сжатие могло сбить, замер возвращает. Пока
 * потолок не набран, прокрутки у поля нет (`overflow-y: hidden`): иначе под
 * курсором мелькала бы полоса, которой вот-вот не станет. На потолке плагин
 * этот запрет снимает, и поле прокручивается. Ручку (`resize: none`) плагин
 * гасит на всё время автороста: высоту ведёт он. Выключили авторост — стили
 * снимает, чужих не трогает. Перехода у высоты нет: поле растёт вместе с
 * набором.
 *
 * **Ввод пользователя — синхронно**, в слушателе `input` поля: значение в
 * узле уже новое, и высота встаёт до отрисовки. Остальное — значение из кода,
 * `rows`, `maxRows`, `autoresize`, `size`, ширина поля и подгруженный шрифт
 * (текст переносится иначе) — **кадром**: значение из кода фреймворк пишет в
 * узел позже, чем ядро о нём сообщает, а размер меняет поля и кегль через
 * класс. Ширину сообщает `ResizeObserver` — плагину важна только она: высоту
 * поля меняет он сам.
 *
 * **Кадр — только при узле**: между `ready` и `removed` своего
 * `TElementPlugin`. Сборка идёт и на сервере, и значение там меняется, а узла
 * и `requestAnimationFrame` нет. Что сменилось до узла, применяет `ready` —
 * сразу.
 */
export class TTextareaAutoresizePlugin extends TBasePlugin<
	ITextarea,
	TTextareaAutoresizePluginEvents
> {
	private _owner: ITextarea | null = null
	/** Поле — `<textarea>` корня, пока узел корня объявлен */
	private _field: HTMLTextAreaElement | null = null
	private _observer: ResizeObserver | null = null
	/** Ширина поля, о которой уже знает плагин: высоту меняет он сам */
	private _width: number | undefined = undefined
	/** Стили поля писал плагин: при выключении автороста есть что снять */
	private _applied = false
	/** Замер в следующем кадре; прежний отложенный отменяется. */
	private readonly _fitNextFrame: () => void
	private readonly _onInput = (): void => this._fit()
	private readonly _onFonts = (): void => this._schedule()

	constructor() {
		super()
		this._fitNextFrame = frameDebounce(() => this._fit())
	}

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<ITextarea>()

		if (!owner) return

		this._owner = owner

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (root) => this._attach(root))
		element?.events.on('removed', () => this._detach())

		const schedule = (): void => this._schedule()

		this._listenTo(owner.events, 'change:value', schedule)
		this._listenTo(owner.events, 'change:rows', schedule)
		this._listenTo(owner.events, 'change:maxRows', schedule)
		this._listenTo(owner.events, 'change:autoresize', schedule)
		this._listenTo(owner.events, 'change:size', schedule)
	}

	override destroy(): void {
		this._detach()
		this._owner = null

		super.destroy()
	}

	private _attach(root: Element): void {
		this._detach()

		const field = fieldOf(root)

		if (!(field instanceof HTMLTextAreaElement)) return

		this._field = field
		field.addEventListener('input', this._onInput)
		field.ownerDocument.fonts?.addEventListener('loadingdone', this._onFonts)

		this._observer = new ResizeObserver((entries) => this._resized(entries))
		this._observer.observe(field, { box: 'border-box' })

		this._fit()
	}

	private _detach(): void {
		const field = this._field

		field?.removeEventListener('input', this._onInput)
		field?.ownerDocument.fonts?.removeEventListener('loadingdone', this._onFonts)

		this._observer?.disconnect()
		this._observer = null
		this._field = null
		this._width = undefined
		this._applied = false
	}

	/** Наблюдатель сообщил размер поля: замер нужен, только если сменилась ширина. */
	private _resized(entries: readonly ResizeObserverEntry[]): void {
		const size = entries.at(-1)?.borderBoxSize?.at(0)

		if (!size || size.inlineSize === this._width) return

		this._width = size.inlineSize
		this._schedule()
	}

	/**
	 * Замерить кадром позже — пока у плагина есть поле. Без узла повод ничего
	 * не планирует: всё, что сменилось до узла, применит `ready`.
	 */
	private _schedule(): void {
		if (this._field) this._fitNextFrame()
	}

	/** Высота поля по тексту — или снять стили, если авторост выключен. */
	private _fit(): void {
		const field = this._field
		const owner = this._owner

		if (!field || !owner) return

		if (!owner.autoresize) {
			this._release(field)

			return
		}

		const restore = holdScroll(field)
		const style = getComputedStyle(field)

		// Замер — в высоту `rows` и без прокрутки: `scrollHeight` отдаёт высоту
		// текста, а не поля, и текст переносится по всей ширине
		field.style.overflowY = 'hidden'
		field.style.height = 'auto'

		const padding = px(style.paddingTop) + px(style.paddingBottom)
		const border = px(style.borderTopWidth) + px(style.borderBottomWidth)
		// Интерлиньяж `normal` числом не прочесть — тогда строку даёт сам
		// браузер: поле без высоты стоит ровно в `rows` его строк
		const line = px(style.lineHeight) || (field.clientHeight - padding) / field.rows
		// Сколько `height` добавляет к строкам: у border-box — поля и рамку
		const frame = style.boxSizing === 'border-box' ? padding + border : 0
		const rows = Math.max(1, owner.rows)
		const min = rows * line + frame
		// Потолок не ниже `rows`; `0` — потолка нет
		const max = owner.maxRows > 0 ? Math.max(rows, owner.maxRows) * line + frame : Infinity
		// Текст в единицах `height`: `scrollHeight` — текст с полями, без рамки
		const content = field.scrollHeight - padding + frame
		// Округление `scrollHeight` до пикселя — не строка сверх потолка
		const overflows = content - max >= 1

		field.style.height = `${Math.min(Math.max(content, min), max)}px`
		field.style.overflowY = overflows ? '' : 'hidden'
		field.style.resize = 'none'
		this._applied = true

		restore()
	}

	/** Авторост выключен — снять то, что писал плагин; без его стилей — ничего. */
	private _release(field: HTMLTextAreaElement): void {
		if (!this._applied) return

		field.style.height = ''
		field.style.overflowY = ''
		field.style.resize = ''
		this._applied = false
	}
}
