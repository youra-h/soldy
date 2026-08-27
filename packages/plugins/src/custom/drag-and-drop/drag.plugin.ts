import type { TCollection } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext, IPluginBundle } from '../../base'
import { TElementPlugin } from '../element'
import { TCollectionBundlesPlugin, TCollectionElements } from '../collection'
import type { TDragPluginEvents } from './types'

/**
 * TDragPlugin — drag-and-drop для перетаскивания элементов коллекции.
 *
 * Слушает нативные события `dragstart`, `dragend`, `dragover` на корневом
 * DOM-элементе компонента и при перетаскивании вызывает `collection.extensions.plain.move()`,
 * синхронизируя порядок DOM-узлов с порядком элементов в коллекции.
 *
 * Зависит от плагинов, которые должны присутствовать в том же бандле:
 * - {@link TElementPlugin} — корневой DOM-элемент компонента;
 * - {@link TCollectionElements} — доступ к DOM-элементам элементов коллекции;
 * - {@link TCollectionBundlesPlugin} — реестр bundles (для отслеживания новых элементов).
 *
 * Коллекция передаётся через {@link activate} (вызывается adapter-слоем).
 *
 * @fires drag:start — при начале перетаскивания, передаёт `{ index, uid }` элемента.
 * @fires drag:end   — при завершении перетаскивания.
 */
export class TDragPlugin extends TBasePlugin<any, TDragPluginEvents> {
	/** CSS-класс визуального состояния перетаскиваемого элемента. */
	private static readonly DRAGGING_CLASS = 's-drag-and-drop__item'

	/** Флаг: плагин активирован и ожидает/обрабатывает перетаскивание. */
	private _active = false

	/** Коллекция, порядок элементов которой синхронизируется при перетаскивании. */
	private _collection: TCollection<any, any> | null = null

	/** Корневой DOM-элемент, на котором висят обработчики drag-событий. */
	private _element: HTMLElement | null = null

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
			if (this._active) this._setup()
		})

		this._elementPlugin?.events.on('removed', () => {
			this._teardown()
			this._element = null
		})
	}

	/**
	 * Активирует перетаскивание для указанной коллекции.
	 * Если DOM-элемент уже готов, немедленно навешивает обработчики.
	 */
	activate(collection: TCollection<any, any>): void {
		this._collection = collection
		this._active = true
		if (this._element) this._setup()
	}

	/**
	 * Деактивирует перетаскивание: снимает обработчики и сбрасывает состояние.
	 */
	deactivate(): void {
		this._teardown()
		this._active = false
		this._collection = null
	}

	/**
	 * Навешивает нативные drag-обработчики на корневой DOM-элемент и помечает
	 * каждый DOM-узел элемента коллекции атрибутом `draggable="true"`.
	 */
	private _setup(): void {
		if (this._cleanup) return

		const element = this._element!
		const collection = this._collection!
		const collectionElements = this._collectionElements!

		// Индекс перетаскиваемого элемента; null — перетаскивание не активно.
		let draggingIndex: number | null = null
		let draggingUid: string | number | null = null
		// Последний DOM-узел, над которым находился курсор.
		let lastDragOverTarget: HTMLElement | null = null

		// Помечаем уже существующие DOM-узлы как перетаскиваемые.
		collectionElements.getAll().forEach((el) => el.setAttribute('draggable', 'true'))

		// Новые элементы (bundle зарегистрирован после активации) тоже помечаем.
		const onBundleRegistered = ({
			bundle,
		}: {
			uid: string | number
			bundle: IPluginBundle
		}) => {
			const elementPlugin = bundle.get(TElementPlugin)

			const markDraggable = (el: HTMLElement) => el.setAttribute('draggable', 'true')

			if (elementPlugin?.element) {
				markDraggable(elementPlugin.element)
			}

			elementPlugin?.events.on('ready', markDraggable)
		}

		this._bundles?.events.on('bundle:registered', onBundleRegistered)

		const onDragStart = (e: DragEvent) => {
			const target = (e.target as HTMLElement).closest(
				'[draggable="true"]',
			) as HTMLElement | null

			if (!target || !element.contains(target)) return

			const uid = collectionElements.getUidByElement(target)
			if (uid === undefined) return

			draggingIndex = collection.engine.findIndex((item: any) => item.uid === uid)
			if (draggingIndex === -1) {
				draggingIndex = null
				draggingUid = null
				return
			}

			draggingUid = uid
			lastDragOverTarget = null

			e.dataTransfer!.effectAllowed = 'move'

			const item = collection.engine[draggingIndex]

			if (item) {
				item.classes.add(TDragPlugin.DRAGGING_CLASS, false)
			} else {
				target.classList.add(TDragPlugin.DRAGGING_CLASS)
			}

			this.events.emit('drag:start', { index: draggingIndex, uid: uid as number })
		}

		const onDragEnd = (e: DragEvent) => {
			if (draggingUid !== null) {
				const item = collection.engine.find((i: any) => i.uid === draggingUid)

				if (item) {
					item.classes.remove(TDragPlugin.DRAGGING_CLASS, false)
				} else {
					const target = (e.target as HTMLElement).closest(
						'[draggable="true"]',
					) as HTMLElement | null
					if (target) target.classList.remove(TDragPlugin.DRAGGING_CLASS)
				}
			}

			draggingIndex = null
			draggingUid = null
			lastDragOverTarget = null

			this.events.emit('drag:end')
		}

		const onDragOver = (e: DragEvent) => {
			e.preventDefault()
			e.dataTransfer!.dropEffect = 'move'

			if (draggingIndex === null) return

			const target = (e.target as HTMLElement).closest(
				'[draggable="true"]',
			) as HTMLElement | null

			if (!target || !element.contains(target)) return

			if (target === lastDragOverTarget) return
			lastDragOverTarget = target

			const targetUid = collectionElements.getUidByElement(target)
			if (targetUid === undefined) return

			const targetIndex = collection.engine.findIndex((item: any) => item.uid === targetUid)
			if (targetIndex === -1 || targetIndex === draggingIndex) return

			const draggingItem = collection.engine[draggingIndex]
			collection.extensions.plain.move(draggingItem, targetIndex, draggingIndex)
			draggingIndex = targetIndex
		}

		element.addEventListener('dragstart', onDragStart)
		element.addEventListener('dragend', onDragEnd)
		element.addEventListener('dragover', onDragOver)

		this._cleanup = () => {
			element.removeEventListener('dragstart', onDragStart)
			element.removeEventListener('dragend', onDragEnd)
			element.removeEventListener('dragover', onDragOver)
			this._bundles?.events.off('bundle:registered', onBundleRegistered)

			collection.engine.forEach((item: any) => {
				item.classes.remove(TDragPlugin.DRAGGING_CLASS, false)
			})

			collectionElements.getAll().forEach((el) => {
				el.removeAttribute('draggable')
				el.classList.remove(TDragPlugin.DRAGGING_CLASS)
			})
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
