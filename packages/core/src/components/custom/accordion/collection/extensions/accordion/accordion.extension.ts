import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import type { TAccordionView } from '../../../types'
import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IAccordionItem } from '../../../item/types'
import type { IAccordion } from '../../../types'
import type {
	TAccordionExtensionEvents,
	TAccordionEngineOptions,
	IAccordionExtension,
} from './types'
import { TAccordionItemExtension, type IAccordionItemExtension } from './item'

/**
 * TAccordionExtension — расширение коллекции для управления элементами accordion.
 *
 * Владелец — опция движка (`owner`): он приходит и уходит после сборки, и
 * расширение наблюдает его (`ctx.options.watch`). `view` секция читает с
 * него, `size` и `variant` расширение пишет ей значениями accordion — их
 * диктует он. `disabled` accordion распространяется на секции, как у
 * `<fieldset>`: выключенный accordion выключает их, включённый — включает.
 *
 * Раскрытость секции — её выбранность в коллекции, — расширение пишет в
 * `aria-expanded` заголовка: сама секция о своём членстве не знает. От
 * владельца она не зависит. `id` заголовка и панели и ссылки между ними
 * пишет плагин секции (`TAccordionItemIdsPlugin`): `id` нужны документу,
 * а не коллекции.
 *
 * @template TOwner — тип владельца (TAccordion или наследник)
 * @template TItem  — тип элемента (IAccordionItem или наследник)
 */
export class TAccordionExtension<
	TOwner extends IAccordion = IAccordion,
	TItem extends IAccordionItem = IAccordionItem,
>
	extends TBaseOwnerItemExtension<
		TItem,
		IAccordionItemExtension<TItem>,
		TAccordionExtensionEvents,
		TAccordionEngineOptions<TOwner>
	>
	implements IExtension<TItem>, IAccordionExtension<TItem>
{
	readonly name = 'accordion' as const

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IAccordionItemExtension<TItem>>) {
		super(TAccordionItemExtension, options)
	}

	/** Внешний вид с инстанса TAccordion. Владельца нет — вида тоже. */
	get view(): TAccordionView | undefined {
		return this._ctx.options.get('owner')?.view
	}

	override install(ctx: IExtensionContext<TItem, TAccordionEngineOptions<TOwner>>): void {
		super.install(ctx)

		// При добавлении элемента — свойства владельца, если он есть
		ctx.driver.events.on('item:added', (e) => this._inheritOwner(e.item as TItem))
		// Патч пишет элементу своё из данных — свойства владельца поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		// Раскрытость — по событию selection-расширения: оно стоит раньше
		const selection = ctx.extensions.selection as ISelectionExtension<TItem> | undefined

		if (selection) {
			selection.events.on('change:selection', () => this._syncExpanded(selection))
			ctx.driver.events.on('item:added', () => this._syncExpanded(selection))

			this._syncExpanded(selection)
		}

		// Владелец — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился владелец, прежние сняты
		let view = this.view

		ctx.options.watch('owner', (owner, scope) => {
			// `view` item-адаптеры читают из расширения — сообщить, если он
			// сменился вместе с владельцем
			if (view !== this.view) {
				view = this.view
				this.events.emit('change:view', view)
			}

			if (!owner) return

			// Догон: элементы, лежавшие до прихода владельца
			ctx.driver.valueOf().forEach((item) => this._inheritOwner(item as TItem))

			// Смена у владельца — всем элементам: `disabled` распространяется на
			// них, как у `<fieldset>`, `size` и `variant` диктует он
			scope.on(owner.events, 'change:disabled', (value: boolean) => {
				ctx.driver.valueOf().forEach((item) => {
					item.disabled = value
				})
			})
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)
			scope.on(owner.events, 'change:variant', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)

			// Внешний вид — в item-адаптеры (TAccordionItemExtension резолвит view
			// из расширения)
			scope.on(owner.events, 'change:view', (value: TAccordionView | undefined) => {
				view = value
				this.events.emit('change:view', value)
			})
		})
	}

	/**
	 * Свойства владельца на элементе: `size` и `variant` — всегда его,
	 * `disabled` — когда владелец выключен. Владельца нет — элемент со своим.
	 */
	private _inheritOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._applyStyle(item, owner)

		if (owner.disabled) item.disabled = true
	}

	/** `size` и `variant` элемента — всегда владельца. */
	private _applyStyle(item: TItem, owner: TOwner): void {
		item.size = owner.size
		item.variant = owner.variant
	}

	/** `aria-expanded` заголовка — у каждой секции: раскрыта ли её панель. */
	private _syncExpanded(selection: ISelectionExtension<TItem>): void {
		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-expanded', selection.isSelected(item) ? 'true' : 'false')
		})
	}
}
