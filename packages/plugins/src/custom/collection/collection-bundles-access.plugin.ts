import { TBasePlugin } from '../../base'
import type { IPluginContext, IPluginBundle } from '../../base'
import { TCollectionBundlesPlugin } from './bundles.plugin'
import type { TCollectionEngine } from '@soldy/core'

/**
 * TCollectionBundlesAccess — базовый плагин доступа к bundles элементов коллекции.
 *
 * Сам ничего не накапливает: накоплением bundles занимается {@link TCollectionBundlesPlugin}.
 * Этот плагин лишь подхватывает реестр bundles в install() и предоставляет удобные
 * accessors для обращения к бандлам по uid/item/индексу.
 *
 * Наследники (например, {@link TCollectionElements}) добавляют свои типизированные
 * accessors поверх bundles.
 */
export abstract class TCollectionBundlesAccess extends TBasePlugin<any> {
	/** Реестр bundles элементов коллекции. */
	protected bundles: TCollectionBundlesPlugin | undefined

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this.bundles = ctx.get(TCollectionBundlesPlugin)
	}

	/** Ссылка на коллекцию, к которой привязан реестр bundles. */
	get collection(): TCollectionEngine<any, any> | null {
		return this.bundles?.collection ?? null
	}

	/** Bundle элемента по uid. */
	protected getBundleByUid(uid: string | number): IPluginBundle | undefined {
		return this.bundles?.getByUid(uid)
	}

	/** Bundle по элементу коллекции. */
	protected getBundleByItem(item: unknown): IPluginBundle | undefined {
		return this.bundles?.getByItem(item)
	}

	/** Элемент коллекции по порядковому индексу. */
	protected getItemByIndex(index: number): unknown {
		return this.bundles?.collection?.engine[index]
	}

	/** Все bundles в порядке элементов коллекции. */
	protected getBundleAll(): IPluginBundle[] {
		return this.bundles?.getAll() ?? []
	}
}
