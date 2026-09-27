import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import { TCollectionEngine } from './../engine'
import type { IExtension, TPlainExtension } from './../engine'
import { releaseEngine, retainEngine } from '../create/internal'
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
 * Движок, пришедший снаружи, фасад держит за владельцем (`resolveEngine`), и
 * держит, пока его монтирование принято: `retain` и `release` зовёт сборка
 * на приём и конец монтирования. Отпущенный движок берёт другой владелец, и
 * фасад прежнего тогда снимается (`destroy`).
 */
export abstract class TCollectionComponent<
	TItem extends object,
	TExtensions extends { plain: TPlainExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TCollectionComponentEvents<TItem> = TCollectionComponentEvents<TItem>,
> extends TComponent<IComponentProps, TEvents> {
	public readonly engine: TCollectionEngine<TItem, TExtensions>

	/** Владелец, за которым фасад держит движок. */
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

	get extensions(): TExtensions {
		return this.engine.extensions
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}

	/** Монтирование принято: владелец держит движок, другой его не возьмёт. */
	retain(): void {
		if (this._owner) retainEngine(this.engine, this._owner, this)
	}

	/**
	 * Монтирование кончилось: движок свободен для другого владельца. Фасад при
	 * этом рабочий — React собирает заново список, живой под StrictMode и
	 * `<Activity>`, на том же фасаде, и тот удерживает движок снова (`retain`).
	 */
	release(): void {
		if (this._owner) releaseEngine(this.engine, this._owner, this)
	}

	/**
	 * Фасад отработал: отпущенный им движок взял другой владелец или другой
	 * фасад того же владельца. Шина очищается — мёртвый фасад не держит релеев
	 * на шинах движка, который живёт дальше. Зовёт запись владения
	 * (`create/internal.ts`).
	 */
	destroy(): void {
		this.events.destroy()
	}
}
