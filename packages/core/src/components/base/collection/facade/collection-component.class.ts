import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import { TCollectionEngine } from './../engine'
import type { IExtension, TPlainExtension } from './../engine'
import { releaseEngine } from '../create/internal'
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
 * Живёт одно монтирование, как контекст, который его собрал: движок взят за
 * владельцем (`resolveEngine`), и уходящий фасад его отпускает (`destroy`).
 */
export abstract class TCollectionComponent<
	TItem extends object,
	TExtensions extends { plain: TPlainExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TCollectionComponentEvents<TItem> = TCollectionComponentEvents<TItem>,
> extends TComponent<IComponentProps, TEvents> {
	public readonly engine: TCollectionEngine<TItem, TExtensions>

	/** Владелец, за которым фасад взял движок: его отпускает `destroy()`. */
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

	/**
	 * Фасад уходит вместе с монтированием. Владелец отпускает движок
	 * (`releaseEngine`): его расширения снимаются с шин, и движок достаётся
	 * следующему владельцу — движок, пришедший снаружи, переживает и фасад, и
	 * владельца. Шина фасада очищается: мёртвый фасад не держит релеев на шинах
	 * движка, который живёт дальше.
	 *
	 * Читать фасад после этого можно: React перечитывает состояние уже
	 * уничтоженной сборки, а расширения ушедшего владельца стоят в карте
	 * движка, пока их место не займёт следующий.
	 */
	destroy(): void {
		if (this._owner) releaseEngine(this.engine, this._owner)

		this.events.destroy()
	}
}
