import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import { TCollectionEngine } from './../engine'
import type { IExtension, TPlainExtension } from './../engine'
import type { ICollectionComponentOptions, TCollectionComponentEvents } from './types'

/**
 * Фасад владельца коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TCollectionEngine` (engine + расширения)
 * и релеит события коллекции в собственный `events`. Благодаря этому дескриптор фасада
 * можно собрать обычным `defineComponent` — без `defineCollection`.
 *
 * Дженерик над `TItem` и набором расширений `TExtensions`, поэтому подходит для любой
 * коллекции (tabs, accordion, list, list-box, tree, ...) с любым набором расширений.
 *
 * Набор сужен до `{ plain }`: системные события фасад берёт из `plain`, а его
 * ставит `baseExtensions()` любой коллекции. Без сужения широкий
 * `Record<string, IExtension>` про `plain` ничего не знал, и здесь стояло
 * приведение. Тип элемента у расширения `any` по той же причине, что у
 * `batch` в `TBatchCollectionFacade`: расширения инвариантны по элементу.
 *
 * Владельца фасад пишет в опции движка (`bindOwner`) и снимает
 * (`releaseOwner`). Свой движок наследник привязывает сразу — хранилище его.
 * Чужой — при принятии компонента: запись в чужое хранилище на сборке оставила
 * бы владельца отброшенной сборки.
 */
export abstract class TCollectionComponent<
	TItem extends object,
	TExtensions extends { plain: TPlainExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TCollectionComponentEvents<TItem> = TCollectionComponentEvents<TItem>,
> extends TComponent<IComponentProps, TEvents> {
	public readonly engine: TCollectionEngine<TItem, TExtensions>
	private readonly _owner: object | undefined

	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.engine = options.engine
		this._owner = options.owner

		// Хранилище целиком — состав проброса объявляет карта plain, не список здесь.
		this.events.relayAll(this.extensions.plain.events)

		// Собственные события движка (engine:create).
		this.events.relayAll(this.engine.events)
	}

	/** Записать владельца в опции движка. Движок занят другим владельцем — ошибка. */
	bindOwner(): void {
		const owner = this._owner

		if (!owner) return

		const current = this.engine.options.get('owner')

		if (current === owner) return

		if (current !== undefined) {
			throw new Error(
				'Коллекция: движок уже принадлежит другому компоненту. Один движок — один компонент.',
			)
		}

		this.engine.options.set({ owner })
	}

	/** Снять владельца с движка, если он там свой. */
	releaseOwner(): void {
		if (this._owner && this.engine.options.get('owner') === this._owner) {
			this.engine.options.set({ owner: undefined })
		}
	}

	get extensions(): TExtensions {
		return this.engine.extensions
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
