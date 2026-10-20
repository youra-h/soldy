import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import { TCollectionEngine } from './../engine'
import type { IExtension, TPlainExtension } from './../engine'
import type { ICollectionComponentOptions, TCollectionComponentEvents } from './types'

/**
 * Держатели привязки владельца по движку — фасады, которые привязали владельца
 * и ещё не сняли привязку, в порядке приёма. Владелец в опциях движка —
 * последнего из них. Список, а не один держатель: прежнее монтирование бывает
 * живо и после того, как снято новое, — Svelte, прервав уход ветки,
 * возобновляет прежнюю без нового приёма, и привязка должна вернуться к ней.
 *
 * Владельца список не хранит: он в опциях движка, а свой — у каждого фасада.
 * Запись отвечает не на вопрос «кто владелец», а на вопрос «чьи монтирования
 * держат привязку». В опциях её нет — их читают расширения, а держатели им не
 * нужны; в движке тоже — движок о фасадах не знает.
 */
const holders = new WeakMap<object, TCollectionComponent<any, any, any>[]>()

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
 *
 * Привязка живёт одно монтирование, как запись реестра bundles, и держит её
 * последнее принятое монтирование из тех, что её брали. Новое монтирование над
 * тем же движком бывает принято раньше, чем снято прежнее: Vue снимает после
 * прохода перерисовки, Svelte — после паузы или ухода прежней ветки, Solid,
 * Angular и Web Components — когда новое место раньше по документу или по
 * дереву. Приём забирает привязку при любом владельце — том же `ctrl` или
 * своём инстансе монтирования без `ctrl`, — снятие держателя отдаёт её
 * предыдущему живому, снятие остальных ничего не меняет. Ошибки «движок занят»
 * нет: в окне перемонтирования два живых владельца законны, и отличить их от
 * двух компонентов потребителя на одном движке нельзя.
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
		super(props)

		this.engine = options.engine
		this._owner = options.owner

		// Хранилище целиком — состав проброса объявляет карта plain, не список здесь.
		this.events.relayAll(this.extensions.plain.events)

		// Собственные события движка (engine:create).
		this.events.relayAll(this.engine.events)
	}

	/**
	 * Забрать привязку: встать последним держателем и записать своего владельца
	 * в опции движка. Движок у другого владельца — привязку забирает этот фасад:
	 * прежний держатель остаётся в списке и получит её обратно, если этот снимут
	 * раньше. Тот же владелец в опциях уже лежит — запись не нужна, а последним
	 * держателем фасад становится всё равно: новое монтирование того же `ctrl`
	 * забирает привязку у прежнего.
	 */
	bindOwner(): void {
		const owner = this._owner

		if (!owner) return

		const list = holders.get(this.engine) ?? []
		const index = list.indexOf(this)

		if (index >= 0) list.splice(index, 1)

		list.push(this)
		holders.set(this.engine, list)

		if (this.engine.options.get('owner') !== owner) this.engine.options.set({ owner })
	}

	/**
	 * Отдать привязку: уйти из держателей. Не последний — привязка остаётся у
	 * последнего, опции не тронуты. Последний — привязка переходит к
	 * предыдущему живому держателю: в опции пишется его владелец, а держателей
	 * не осталось — пустое значение. Пишется только смена и только поверх
	 * своего: владельца, записанного в опции мимо фасадов, снятие не трогает.
	 * Фасад, который ничего не привязывал (сборка, уничтоженная без приёма),
	 * не трогает ничего.
	 */
	releaseOwner(): void {
		const list = holders.get(this.engine)
		const index = list ? list.indexOf(this) : -1

		if (!list || index < 0) return

		list.splice(index, 1)

		if (list.length === 0) holders.delete(this.engine)

		// Снят не последний: привязка — у последнего, как была
		if (index < list.length) return

		const owner = list.at(-1)?._owner

		if (this.engine.options.get('owner') === this._owner && owner !== this._owner) {
			this.engine.options.set({ owner })
		}
	}

	get extensions(): TExtensions {
		return this.engine.extensions
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
