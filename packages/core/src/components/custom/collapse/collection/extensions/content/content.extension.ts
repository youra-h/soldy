import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IExtension,
	IExtensionContext,
	ISelectionExtension,
} from '../../../../../base/collection'
import type { ICollapseItem } from '../../../item/types'
import { TCollapseContentItemExtension, type ICollapseContentItemExtension } from './item'
import type {
	ICollapseContentExtension,
	ICollapseContentExtensionOptions,
	TCollapseContentExtensionEvents,
} from './types'

/**
 * TCollapseContentExtension — расширение коллекции под панели Collapse.
 *
 * Держит формулу идентификаторов связки «заголовок ↔ панель» и проставляет её
 * сторону заголовка в `aria` элемента при добавлении в коллекцию — так она
 * попадает в первую же отрисовку, включая серверную.
 *
 * Сторона панели остаётся пропом (`content_aria`): в отличие от Tabs у панели
 * Collapse нет своего компонента — она лежит внутри элемента и отдельно от
 * него не существует. Писать её некуда, набор есть только у экземпляра.
 */
export class TCollapseContentExtension<TItem extends ICollapseItem = ICollapseItem>
	extends TBaseOwnerItemExtension<
		TItem,
		ICollapseContentItemExtension<TItem>,
		TCollapseContentExtensionEvents
	>
	implements IExtension<TItem>, ICollapseContentExtension<TItem>
{
	readonly name = 'content' as const

	constructor(options?: ICollapseContentExtensionOptions<TItem>) {
		super(TCollapseContentItemExtension as any, options)
	}

	/** `id` элемента-заголовка. */
	headerId(item: TItem): string {
		return `s-collapse-header-${item.uid}`
	}

	/** `id` раскрывающейся панели. */
	contentId(item: TItem): string {
		return `s-collapse-content-${item.uid}`
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.forEach((item) => this._linkHeader(item))
		ctx.driver.events.on('item:added', (e) => this._linkHeader(e.item as TItem))

		// `aria-expanded` — раскрытость, то есть выбранность элемента в
		// коллекции. Сам элемент о своём членстве не знает, поэтому пишем
		// отсюда, по событию selection-расширения.
		const selection = ctx.extensions.selection as ISelectionExtension<TItem> | undefined

		if (selection) {
			selection.events.on('change:selection', () => this._syncExpanded(ctx))

			ctx.driver.events.on('item:added', () => this._syncExpanded(ctx))

			this._syncExpanded(ctx)
		}
	}

	private _linkHeader(item: TItem): void {
		item.aria.add('id', this.headerId(item))
		item.aria.add('aria-controls', this.contentId(item))
	}

	private _syncExpanded(ctx: IExtensionContext<TItem>): void {
		const selection = ctx.extensions.selection as ISelectionExtension<TItem> | undefined

		if (!selection) return

		ctx.driver.forEach((item) => {
			item.aria.add('aria-expanded', selection.isSelected(item) ? 'true' : 'false')
		})
	}
}
