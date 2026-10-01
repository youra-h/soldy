import { TBaseExtension } from '../../../../../base/collection'
import type {
	IActivationExtension,
	IExtension,
	IExtensionContext,
} from '../../../../../base/collection'
import type { IRadioGroupItem } from '../../../item/types'
import type { IRadioGroup, TRadioGroupValue, TRadioGroupView } from '../../../types'
import type { TRadioGroupEngineOptions, TRadioGroupExtensionEvents } from './types'

/**
 * TRadioGroupExtension — то, что радио знает благодаря своей группе.
 *
 * Группа — опция движка (`owner`): она приходит и уходит после сборки, и
 * расширение наблюдает её (`ctx.options.watch`). Без группы радио живут со
 * своими свойствами, а отметка — сама по себе.
 *
 * **Свойства группы на радио.** `view` и общий `name` группа раздаёт каждому
 * радио — при добавлении, догоном и на смену своего значения, так же —
 * `size` и `variant`: их диктует она. `disabled` группы распространяется
 * на радио, как у `<fieldset>`. Тема читает модификаторы с корня радио, потому что
 * у контейнера группы стилей нет.
 *
 * **Связь `value` ⇄ активное радио.** Коллекция хранит отмеченное радио
 * **элементом**, наружу нужен ответ в **значении**. Держится по образцу
 * `TValueSelectionExtension`: флаг от зацикливания, повтор на добавлении и
 * смене состава, направление при приходе группы — от того, у кого есть что
 * сказать. Общим расширением движка связь не стала: потребитель у неё один.
 *
 * Значение меняет только выбор: радио отметили или сняли отметку с радио,
 * которое осталось в группе. Ушедшее из группы отмеченное радио значение не
 * трогает — как удалённый выбранный элемент у ListBox: радио могло уйти на
 * время (`v-if`, перерисовка состава, размонтирование всей группы), и
 * значение дождётся его на `item:added`. Иначе повторная запись `items`
 * (очистка и новый набор) и размонтирование группы стирали бы `v-model`.
 *
 * Адаптер элемента не нужен: всё, что расширение пишет элементу, пишется в
 * его собственные свойства.
 */
export class TRadioGroupExtension<
	TOwner extends IRadioGroup = IRadioGroup,
	TItem extends IRadioGroupItem = IRadioGroupItem,
>
	extends TBaseExtension<TItem, TRadioGroupExtensionEvents, TRadioGroupEngineOptions<TOwner>>
	implements IExtension<TItem, TRadioGroupExtensionEvents>
{
	readonly name = 'radioGroup' as const

	/**
	 * Идёт синхронизация `value` ⇄ активное радио. Флаг, а не сравнение
	 * значений: сброс активного при значении без радио тоже шлёт
	 * `item:deactivated`, и сравнение затёрло бы заданное значение пустым.
	 */
	private _syncing = false

	/**
	 * Общий `name` радио группы — своё имя группы, а без него имя от её основы
	 * (`idBase`). Группы нет — нет и имени.
	 *
	 * Без общего `name` браузер не соберёт радио в группу: не будет ни стрелок,
	 * ни одной остановки Tab, ни снятия отметки с соседа. Основа у каждой группы
	 * своя, поэтому две безымянные группы на странице не сольются.
	 */
	get groupName(): string {
		const owner = this._ctx.options.get('owner')

		if (!owner) return ''

		return owner.name || `s-radio-group-${owner.idBase}`
	}

	override install(ctx: IExtensionContext<TItem, TRadioGroupEngineOptions<TOwner>>): void {
		super.install(ctx)

		// После вставки на месте источника уже инстанс: `TFactoryExtension`
		// подменяет его в `item:add:before`
		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Патч пишет элементу своё из данных — свойства владельца поверх
		ctx.driver.events.on('item:updated', (e) => this._inheritOwner(e.item as TItem))

		const activation = this._activation

		activation?.events.on('item:activated', () => this._activationToValue())

		// Отметку снимает и активация сама, когда отмеченное радио удалили из
		// коллекции. Это не выбор «ничего»: радио в группе уже нет
		activation?.events.on('item:deactivated', (item) => {
			if (item && !ctx.driver.valueOf().includes(item)) return

			this._activationToValue()
		})

		// Радио могло приехать позже, чем выставили `value`: элементы
		// регистрируются при монтировании, а проп приходит сразу
		ctx.driver.events.on('item:added', () => this._valueToActivation())
		ctx.driver.events.on('change:items', () => this._valueToActivation())

		// Группа — опция движка: приходит и уходит после сборки. Подписки на неё
		// живут в области наблюдателя — сменилась группа, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Догон: радио, лежавшие до прихода группы
			ctx.driver.valueOf().forEach((item) => this._applyOwner(item))

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

			scope.on(owner.events, 'change:view', (value: TRadioGroupView | undefined) => {
				ctx.driver.valueOf().forEach((item) => {
					item.view = value
				})
			})

			scope.on(owner.events, 'change:name', () => {
				const name = this.groupName

				ctx.driver.valueOf().forEach((item) => {
					item.name = name
				})
			})

			scope.on(owner.events, 'change:value', () => this._valueToActivation())

			this._reconcile(owner)
		})
	}

	private get _activation(): IActivationExtension<TItem> | undefined {
		return this._ctx.extensions.activation as IActivationExtension<TItem> | undefined
	}

	/**
	 * Свести `value` группы и отмеченное радио. Направление — по тому, у кого
	 * есть что сказать: значение задано пропом — главное оно; нет — движок
	 * могли собрать снаружи уже с отмеченным радио (`meta.active`), и его
	 * нельзя затереть пустым значением.
	 */
	private _reconcile(owner: TOwner): void {
		if (hasValue(owner.value) || !this._activation?.activeItem) {
			this._valueToActivation()
		} else {
			this._activationToValue()
		}
	}

	/**
	 * Свойства владельца на элементе: `size` и `variant` — всегда его,
	 * `disabled` — когда владелец выключен.
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

	/**
	 * Свойства группы, которые радио получает от неё, а не задаёт само.
	 * Группы нет — радио со своими.
	 */
	private _applyOwner(item: TItem): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		this._inheritOwner(item)
		item.view = owner.view
		item.name = this.groupName
	}

	/** Активное радио → `value`. Не отмечено ничего — `undefined`. */
	private _activationToValue(): void {
		const activation = this._activation
		const owner = this._ctx.options.get('owner')

		if (!activation || !owner || this._syncing) return

		this._syncing = true

		try {
			owner.value = activation.activeItem?.value
		} finally {
			this._syncing = false
		}
	}

	/**
	 * `value` → активное радио.
	 *
	 * Значение без радио снимает отметку, но само остаётся: радио с таким
	 * значением могло ещё не приехать, и повторный проход случится на
	 * `item:added`. Отметку выключенному радио значение ставит — выбрать из
	 * кода то, что пользователь выбрать не может, право приложения.
	 *
	 * Отметку, отменённую в `item:activate:before`, значение не меняет: оно
	 * откатывается к отмеченному радио.
	 */
	private _valueToActivation(): void {
		const activation = this._activation
		const owner = this._ctx.options.get('owner')

		if (!activation || !owner || this._syncing) return

		const value = owner.value
		const item = hasValue(value)
			? this._ctx.driver.valueOf().find((candidate) => candidate.value === value)
			: undefined

		let rejected = false

		this._syncing = true

		try {
			if (item) {
				rejected = !activation.activate(item)
			} else {
				activation.reset()
			}
		} finally {
			this._syncing = false
		}

		if (rejected) this._activationToValue()
	}
}

/** Задано ли значение. Пустая строка — «не отмечено», а не значение `''`. */
function hasValue(value: TRadioGroupValue): value is string | number {
	return value !== undefined && value !== ''
}
