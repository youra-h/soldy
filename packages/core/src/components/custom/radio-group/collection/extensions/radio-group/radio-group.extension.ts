import { TBaseExtension } from '../../../../../base/collection'
import type {
	IActivationExtension,
	IExtension,
	IExtensionContext,
} from '../../../../../base/collection'
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'
import type { IRadioGroupItem } from '../../../item/types'
import type { IRadioGroup, TRadioGroupValue, TRadioGroupView } from '../../../types'
import type { IRadioGroupExtensionOptions, TRadioGroupExtensionEvents } from './types'

/**
 * TRadioGroupExtension — то, что радио знает благодаря своей группе.
 *
 * **Свойства группы на радио.** `size`, `variant`, `view` и общий `name`
 * группа раздаёт каждому радио — при добавлении, догоном и на смену своего
 * значения. `disabled` не раздаётся, а сочетается: радио выключено, если
 * выключено само или выключена группа (`bindDisabledToOwner`). Тема читает
 * модификаторы с корня радио, потому что у контейнера группы стилей нет.
 *
 * **Связь `value` ⇄ активное радио.** Коллекция хранит отмеченное радио
 * **элементом**, наружу нужен ответ в **значении**. Держится по образцу
 * `TValueSelectionExtension`: флаг от зацикливания, повтор на добавлении и
 * смене состава, направление на старте — от того, у кого есть что сказать.
 * Общим расширением движка связь не стала: потребитель у неё один.
 *
 * Адаптер элемента не нужен: всё, что расширение пишет элементу, пишется в
 * его собственные свойства.
 */
export class TRadioGroupExtension<
	TOwner extends IRadioGroup = IRadioGroup,
	TItem extends IRadioGroupItem = IRadioGroupItem,
>
	extends TBaseExtension<TItem, TRadioGroupExtensionEvents>
	implements IExtension<TItem, TRadioGroupExtensionEvents>
{
	readonly name = 'radioGroup' as const

	protected readonly _owner: TOwner

	/**
	 * Идёт синхронизация `value` ⇄ активное радио. Флаг, а не сравнение
	 * значений: сброс активного при значении без радио тоже шлёт
	 * `change:activation`, и сравнение затёрло бы заданное значение пустым.
	 */
	private _syncing = false

	constructor(options: IRadioGroupExtensionOptions<TOwner>) {
		super()

		this._owner = options.owner
	}

	/**
	 * Общий `name` радио группы — своё имя группы, а без него имя от её `uid`.
	 *
	 * Без общего `name` браузер не соберёт радио в группу: не будет ни стрелок,
	 * ни одной остановки Tab, ни снятия отметки с соседа. `uid` уникален в
	 * рамках сессии, поэтому две безымянные группы на странице не сольются.
	 */
	get groupName(): string {
		return this._owner.name || `s-radio-group-${this._owner.uid}`
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// После вставки на месте источника уже инстанс: `TFactoryExtension`
		// подменяет его в `item:add:before`
		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._applyOwner(item))

		// Итог `disabled` радио отдаёт резольвер — сообщаем тем, у кого он сменился
		this._owner.events.on('change:disabled', () => notifyOwnerDisabled(ctx.driver.valueOf()))

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				ctx.driver.valueOf().forEach((item) => {
					item.variant = payload.newValue
				})
			},
		)

		this._owner.events.on('change:view', (value: TRadioGroupView | undefined) => {
			ctx.driver.valueOf().forEach((item) => {
				item.view = value
			})
		})

		this._owner.events.on('change:name', () => {
			const name = this.groupName

			ctx.driver.valueOf().forEach((item) => {
				item.name = name
			})
		})

		this._activation?.events.on('change:activation', () => this._activationToValue())
		this._owner.events.on('change:value', () => this._valueToActivation())

		// Радио могло приехать позже, чем выставили `value`: элементы
		// регистрируются при монтировании, а проп приходит сразу
		ctx.driver.events.on('item:added', () => this._valueToActivation())
		ctx.driver.events.on('change:items', () => this._valueToActivation())

		// Направление на старте — по тому, у кого есть что сказать: значение
		// задано пропом — главное оно; нет — движок могли собрать снаружи уже с
		// отмеченным радио (`meta.active`), и его нельзя затереть пустым значением
		if (hasValue(this._owner.value) || !this._activation?.activeItem) {
			this._valueToActivation()
		} else {
			this._activationToValue()
		}
	}

	private get _activation(): IActivationExtension<TItem> | undefined {
		return this._ctx.extensions.activation as IActivationExtension<TItem> | undefined
	}

	/** Свойства группы, которые радио получает от неё, а не задаёт само. */
	private _applyOwner(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		item.size = this._owner.size
		item.variant = this._owner.variant
		item.view = this._owner.view
		item.name = this.groupName
	}

	/** Активное радио → `value`. Не отмечено ничего — `undefined`. */
	private _activationToValue(): void {
		const activation = this._activation

		if (!activation || this._syncing) return

		this._syncing = true

		try {
			this._owner.value = activation.activeItem?.value
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
	 */
	private _valueToActivation(): void {
		const activation = this._activation

		if (!activation || this._syncing) return

		const value = this._owner.value
		const item = hasValue(value)
			? this._ctx.driver.valueOf().find((candidate) => candidate.value === value)
			: undefined

		this._syncing = true

		try {
			if (item) {
				activation.activate(item)
			} else {
				activation.reset()
			}
		} finally {
			this._syncing = false
		}
	}
}

/** Задано ли значение. Пустая строка — «не отмечено», а не значение `''`. */
function hasValue(value: TRadioGroupValue): value is string | number {
	return value !== undefined && value !== ''
}
