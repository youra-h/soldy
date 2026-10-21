import { batchOf } from '@soldy-ui/core'
import type { IComponentView, IDragAndDrop, TCollectionEngine } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext, IPluginBundle } from '../../base'
import { TElementPlugin } from '../element'
import type { IDomEventTarget } from '../../utils'
import { TCollectionBundlesPlugin, TCollectionElements } from '../collection'
import type { TDragPluginEvents } from './types'

/**
 * TDragPlugin — жест перестановки элементов коллекции: нативное
 * перетаскивание DOM в команду обёртки `DragAndDrop`.
 *
 * Слушает `dragstart`, `dragover`, `drop` и `dragend` на корневом DOM-элементе
 * компонента. Переставляет не плагин: на каждый `dragover` над другим
 * элементом он зовёт команду обёртки (`IDragAndDrop.move`), а та шлёт свои
 * события и переставляет элемент в движке. Место взятого плагин не помнит —
 * оно в составе коллекции: отменённую перестановку и место, подменённое хуком
 * движка, он не пересчитывает сам. Перестановка живая — элемент встаёт на
 * место под указателем по ходу жеста.
 *
 * - **Взять** можно то, что разрешает обёртка (`IDragAndDrop.canMove`):
 *   `dragstart` выключенного элемента отменён, и жеста нет вовсе.
 * - **Место спрашивается, когда указатель пришёл на другой элемент**, а не на
 *   каждый `dragover`: он идёт непрерывно, пока указатель стоит, и отменённое
 *   место иначе переспрашивалось бы без конца.
 * - **Принимает плагин только свой жест**: `dragover` и `drop` чужого
 *   перетаскивания — файла, текста — идут как без него, и курсора
 *   «переместить» над списком у них нет. Свой `drop` — без действия браузера
 *   по умолчанию: перестановка уже сделана.
 * - **Пальцем элемент берёт долгое нажатие** (`LONG_PRESS`), событиями
 *   указателя: нативного перетаскивания у касания на телефонах нет или оно
 *   спорит с прокруткой. Палец, ушедший за порог (`TOUCH_SLOP`) раньше, —
 *   прокрутка. Взятый несут — `touchmove` отменён, и страница стоит; узел
 *   под пальцем — точкой документа. Пока палец держит элемент, меню и
 *   выделение долгого нажатия и нативный `dragstart` отменены. Шаги жеста —
 *   взять, прийти на элемент, кончить — у мыши и пальца общие.
 *
 * Зависит от плагинов, которые должны присутствовать в том же бандле:
 * - {@link TElementPlugin} — корневой DOM-элемент компонента;
 * - {@link TCollectionElements} — доступ к DOM-элементам элементов коллекции;
 * - {@link TCollectionBundlesPlugin} — реестр bundles (для отслеживания новых элементов).
 *
 * Коллекцию и обёртку передаёт {@link activate} (вызывает adapter-слой).
 *
 * @fires drag:start — свой жест начался, передаёт `{ index, uid }` взятого элемента.
 * @fires drag:end   — свой жест кончился.
 */
export class TDragPlugin extends TBasePlugin<any, TDragPluginEvents> {
	/** CSS-класс визуального состояния перетаскиваемого элемента. */
	private static readonly DRAGGING_CLASS = 'so-drag-and-drop__item'

	/**
	 * Долгое нажатие пальцем, после которого элемент взят, мс. Около таймаута
	 * долгого нажатия у Android: раньше палец, который начал прокрутку, не
	 * успевает уйти за порог, позже — нажатие кажется зависшим.
	 */
	private static readonly LONG_PRESS = 450

	/** Сдвиг пальца до долгого нажатия, за которым касание — прокрутка, px. */
	private static readonly TOUCH_SLOP = 10

	/** Коллекция, элементы которой переставляют; `null` — перетаскивание не включено. */
	private _engine: TCollectionEngine<any, any> | null = null

	/** Обёртка, командой которой коллекция переставляется. */
	private _dragAndDrop: IDragAndDrop | null = null

	/** Корневой DOM-элемент, на котором висят обработчики drag-событий. */
	private _element: Element | null = null

	/** Ссылка на плагин, предоставляющий корневой DOM-элемент. */
	private _elementPlugin: TElementPlugin | null = null

	/** Ссылка на плагин доступа к DOM-элементам элементов коллекции. */
	private _collectionElements: TCollectionElements | null = null

	/** Ссылка на реестр bundles (для отслеживания новых элементов коллекции). */
	private _bundles: TCollectionBundlesPlugin | null = null

	/** Функция очистки: снимает слушателей событий и атрибуты draggable. */
	private _cleanup: (() => void) | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._elementPlugin = ctx.get(TElementPlugin) ?? null
		this._collectionElements = ctx.get(TCollectionElements) ?? null
		this._bundles = ctx.get(TCollectionBundlesPlugin) ?? null

		this._elementPlugin?.events.on('ready', (element) => {
			this._element = element
			// DOM готов — можно навешивать обработчики, если плагин уже активирован.
			this._setup()
		})

		this._elementPlugin?.events.on('removed', () => {
			this._teardown()
			this._element = null
		})
	}

	/**
	 * Включает перетаскивание элементов коллекции командой обёртки.
	 * Если DOM-элемент уже готов, немедленно навешивает обработчики; включённое
	 * раньше — с другой коллекцией или обёрткой — снимается.
	 */
	activate(engine: TCollectionEngine<any, any>, dragAndDrop: IDragAndDrop): void {
		this._teardown()

		this._engine = engine
		this._dragAndDrop = dragAndDrop

		this._setup()
	}

	/**
	 * Деактивирует перетаскивание: снимает обработчики и сбрасывает состояние.
	 */
	deactivate(): void {
		this._teardown()

		this._engine = null
		this._dragAndDrop = null
	}

	/**
	 * Навешивает нативные drag-обработчики на корневой DOM-элемент и помечает
	 * каждый DOM-узел элемента коллекции атрибутом `draggable="true"`.
	 */
	private _setup(): void {
		const element = this._element
		const engine = this._engine
		const dragAndDrop = this._dragAndDrop
		const collectionElements = this._collectionElements

		// Без корня, коллекции, обёртки или TCollectionElements в бандле перетаскивать нечего.
		if (this._cleanup || !element || !engine || !dragAndDrop || !collectionElements) return

		/** Взятый элемент, пока идёт свой жест; `null` — своего жеста нет. */
		let dragging: IComponentView | null = null

		/** Узел элемента под указателем на прошлом `dragover`: место спрошено для него. */
		let over: Element | null = null

		const markDraggable = (el: Element) => el.setAttribute('draggable', 'true')

		// Помечаем уже существующие DOM-узлы как перетаскиваемые.
		collectionElements.getAll().forEach(markDraggable)

		/** Узлы элементов, пришедших после включения: подписка снимается вместе с остальным. */
		const watched: TElementPlugin[] = []

		// Новые элементы (bundle зарегистрирован после активации) тоже помечаем.
		const onBundleRegistered = ({
			bundle,
		}: {
			uid: string | number
			bundle: IPluginBundle
		}) => {
			const elementPlugin = bundle.get(TElementPlugin)

			if (!elementPlugin) return

			if (elementPlugin.element) markDraggable(elementPlugin.element)

			elementPlugin.events.on('ready', markDraggable)
			watched.push(elementPlugin)
		}

		this._bundles?.events.on('bundle:registered', onBundleRegistered)

		// Элементы перетаскиваемой коллекции — компоненты: у них есть uid и classes.
		// Состав читается при каждом событии: между ними коллекция могла измениться.
		const collectionItems = (): ReadonlyArray<IComponentView> =>
			batchOf<IComponentView>(engine)?.items ?? []

		/**
		 * Узел элемента, на котором случилось событие, — ближайший перетаскиваемый
		 * предок цели внутри корня. Цель — не элемент (текст) — узла нет.
		 */
		const nodeOf = (target: EventTarget | null): Element | null => {
			const node = target instanceof Element ? target.closest('[draggable="true"]') : null

			return node && element.contains(node) ? node : null
		}

		/** Элемент этой коллекции по его узлу и `uid` из реестра; узел чужой — ничего. */
		const itemOf = (node: Element | null) => {
			const uid = node ? collectionElements.getUidByElement(node) : undefined
			const item = collectionItems().find((each) => each.uid === uid)

			return uid === undefined || !item ? undefined : { uid, item }
		}

		/** Взятый элемент — жест начат: метка взятого и `drag:start`. */
		const take = (found: { uid: string | number; item: IComponentView }) => {
			dragging = found.item
			over = null

			found.item.classes.add(TDragPlugin.DRAGGING_CLASS, false)

			this.events.emit('drag:start', {
				index: collectionItems().indexOf(found.item),
				uid: found.uid,
			})
		}

		/** Указатель пришёл на узел: место спрашивается, только если узел другой. */
		const reach = (moving: IComponentView, node: Element | null) => {
			// Над тем же элементом место уже спрошено — и отменённое тоже
			if (node === over) return
			over = node

			const target = itemOf(node)?.item

			if (!target) return

			// Место взятого — в составе коллекции: команда сама знает, где он стоит
			dragAndDrop.move(engine, moving, collectionItems().indexOf(target))
		}

		/** Жест кончился: метка взятого снята, `drag:end`. */
		const finish = (moving: IComponentView) => {
			moving.classes.remove(TDragPlugin.DRAGGING_CLASS, false)
			dragging = null
			over = null

			this.events.emit('drag:end')
		}

		/**
		 * Касание, которое может стать жестом: нажали на элемент, который можно
		 * взять, и держат. `taken` — долгое нажатие состоялось, элемент взят.
		 */
		let press: {
			readonly pointer: number
			readonly x: number
			readonly y: number
			readonly timer: ReturnType<typeof setTimeout>
			taken: boolean
		} | null = null

		/** Касание кончилось или стало прокруткой: таймер снят, жеста от него нет. */
		const release = () => {
			if (press) clearTimeout(press.timer)
			press = null
		}

		const onDragStart = (e: DragEvent) => {
			// Пальцем элемент берёт долгое нажатие, а не нативный жест браузера:
			// он на телефонах либо не начинается, либо спорит с прокруткой
			if (press) {
				e.preventDefault()
				return
			}

			const found = itemOf(nodeOf(e.target))

			if (!found) return

			// Взять нельзя — жеста нет вовсе: браузер его не начинает
			if (!dragAndDrop.canMove(engine, found.item)) {
				e.preventDefault()
				return
			}

			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move'
				// Без данных жеста Firefox перетаскивание не начинает
				e.dataTransfer.setData('text/plain', '')
			}

			take(found)
		}

		const onDragEnd = () => {
			if (dragging) finish(dragging)
		}

		const onDragOver = (e: DragEvent) => {
			// Чужое перетаскивание — файл, текст — идёт как без плагина
			if (!dragging) return

			e.preventDefault()
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'

			reach(dragging, nodeOf(e.target))
		}

		const onDrop = (e: DragEvent) => {
			// Свой жест: перестановка уже сделана, действие браузера не нужно
			if (dragging) e.preventDefault()
		}

		/**
		 * Касание элемента — кандидат в жест. Палец, а не мышь: мышь берёт
		 * элемент нативным перетаскиванием. Жест — один, второй палец его не
		 * перехватывает.
		 */
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType !== 'touch' || !e.isPrimary || press || dragging) return

			const found = itemOf(nodeOf(e.target))

			if (!found || !dragAndDrop.canMove(engine, found.item)) return

			const timer = setTimeout(() => {
				if (!press) return

				press.taken = true
				take(found)
			}, TDragPlugin.LONG_PRESS)

			press = { pointer: e.pointerId, x: e.clientX, y: e.clientY, timer, taken: false }
		}

		/**
		 * Палец до долгого нажатия ушёл за порог — это прокрутка, жеста нет.
		 * Взятый элемент идёт за пальцем: узел под ним — по точке, а не по цели
		 * события, — касание браузер захватывает за узлом, где оно началось.
		 */
		const onPointerMove = (e: PointerEvent) => {
			if (!press || e.pointerId !== press.pointer) return

			if (!press.taken) {
				if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > TDragPlugin.TOUCH_SLOP) {
					release()
				}
				return
			}

			if (dragging) {
				reach(
					dragging,
					nodeOf(element.ownerDocument.elementFromPoint(e.clientX, e.clientY)),
				)
			}
		}

		/** Палец отпустили или браузер его отнял: жест, если был, кончился. */
		const onPointerEnd = (e: PointerEvent) => {
			if (!press || e.pointerId !== press.pointer) return

			const taken = press.taken

			release()

			if (taken && dragging) finish(dragging)
		}

		/**
		 * Взятый элемент несут — страница под пальцем не прокручивается. Отменить
		 * прокрутку может только `touchmove`, и слушатель у него не пассивный.
		 */
		const onTouchMove = (e: TouchEvent) => {
			if (press?.taken) e.preventDefault()
		}

		/**
		 * Долгое нажатие у браузера своё: на Android — контекстное меню, на iOS —
		 * выделение текста. Пока палец держит элемент, они не начинаются.
		 */
		const onPressDefault = (e: Event) => {
			if (press) e.preventDefault()
		}

		const target: IDomEventTarget = element

		target.addEventListener('dragstart', onDragStart)
		target.addEventListener('dragend', onDragEnd)
		target.addEventListener('dragover', onDragOver)
		target.addEventListener('drop', onDrop)
		target.addEventListener('pointerdown', onPointerDown)
		target.addEventListener('pointermove', onPointerMove)
		target.addEventListener('pointerup', onPointerEnd)
		target.addEventListener('pointercancel', onPointerEnd)
		target.addEventListener('touchmove', onTouchMove, { passive: false })
		target.addEventListener('contextmenu', onPressDefault)
		target.addEventListener('selectstart', onPressDefault)

		this._cleanup = () => {
			target.removeEventListener('dragstart', onDragStart)
			target.removeEventListener('dragend', onDragEnd)
			target.removeEventListener('dragover', onDragOver)
			target.removeEventListener('drop', onDrop)
			target.removeEventListener('pointerdown', onPointerDown)
			target.removeEventListener('pointermove', onPointerMove)
			target.removeEventListener('pointerup', onPointerEnd)
			target.removeEventListener('pointercancel', onPointerEnd)
			target.removeEventListener('touchmove', onTouchMove)
			target.removeEventListener('contextmenu', onPressDefault)
			target.removeEventListener('selectstart', onPressDefault)
			this._bundles?.events.off('bundle:registered', onBundleRegistered)

			for (const elementPlugin of watched) elementPlugin.events.off('ready', markDraggable)

			release()
			dragging?.classes.remove(TDragPlugin.DRAGGING_CLASS, false)
			dragging = null

			collectionElements.getAll().forEach((el) => el.removeAttribute('draggable'))
		}
	}

	private _teardown(): void {
		this._cleanup?.()
		this._cleanup = null
	}

	override destroy(): void {
		this._teardown()
		super.destroy()
	}
}
