import type { IField } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import type { IFieldControlInfo, IFieldLinks, TFieldIdsPluginEvents } from './types'

/** Ссылок нет: ни одна часть не рисуется. */
const NO_LINKS: IFieldLinks = {}

/**
 * TFieldIdsPlugin — связки поля формы в документе: подпись, подсказка и ошибка
 * с контролом.
 *
 * `id` частей — в их наборы (`labelAria`, `helperAria`, `errorAria`), от
 * монтирования поля (`createId`), а не от экземпляра: они нужны только
 * документу, и на сервере и в браузере обязаны совпасть. Пишутся при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 *
 * **Ссылки контрола на части** (`links`) плагин считает, а пишет их в `aria`
 * контрола связка поля с контролом — через его `TAriaPlugin`: часть
 * подписи — пока подпись рисуется, справка — та, что видна: ошибка, а без неё
 * подсказка. Сменилась видимая часть — `change:links`.
 *
 * **`for` подписи** — `<id монтирования>-control` (`controlId`): этот же `id`
 * labelable-контрол без своего получает от связки своим `id`, и подпись
 * называет его и передаёт ему клик с первой отрисовки. Принятый контрол
 * сообщает о себе (`bindControl`): `for` ведёт на его `id`, а у группы
 * (DateInput, DatePicker, RadioGroup) `for` снят — её подпись называет
 * ссылкой `aria-labelledby`. Снятый контрол (`unbindControl`) возвращает
 * `for` к `controlId`. Контрол у поля один: связку берёт первый.
 */
export class TFieldIdsPlugin extends TBasePlugin<IField, TFieldIdsPluginEvents> {
	private _field: IField | null = null
	private _labelId = ''
	private _helperId = ''
	private _errorId = ''
	private _controlId = ''
	private _links: IFieldLinks = NO_LINKS
	private _control: IFieldControlInfo | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const field = ctx.getInstance<IField>()

		if (!field) return

		this._field = field
		this._labelId = ctx.createId('label')
		this._helperId = ctx.createId('helper')
		this._errorId = ctx.createId('error')
		this._controlId = ctx.createId('control')

		field.labelAria.add('id', this._labelId)
		field.helperAria.add('id', this._helperId)
		field.errorAria.add('id', this._errorId)

		this._syncFor()
		this._links = this._linksOf(field)

		const relink = (): void => this._relink(field)

		this._listenTo(field.events, 'change:label', relink)
		this._listenTo(field.events, 'change:helper', relink)
		this._listenTo(field.events, 'change:error', relink)
		this._listenTo(field.events, 'change:invalid', relink)
	}

	/**
	 * `id` поля контрола от поля: его получает labelable-контрол без своего
	 * `id`, на него ведёт `for` подписи.
	 */
	get controlId(): string {
		return this._controlId
	}

	/** Ссылки контрола на видимые части. Новый объект на каждую смену. */
	get links(): IFieldLinks {
		return this._links
	}

	/** Занята ли связка: контрол у поля один. */
	get bound(): boolean {
		return this._control !== null
	}

	/**
	 * Контрол приняли — `for` подписи по нему. Зовёт связка и на смену `id`
	 * контрола.
	 */
	bindControl(control: IFieldControlInfo): void {
		this._control = control
		this._syncFor()
	}

	/** Контрол сняли: связка свободна, `for` — снова на `controlId`. */
	unbindControl(): void {
		this._control = null
		this._syncFor()
	}

	override destroy(): void {
		this._field = null
		this._control = null
		this._links = NO_LINKS

		super.destroy()
	}

	private _syncFor(): void {
		this._field?.labelAria.add('for', this._forOf(this._control))
	}

	/**
	 * `for` подписи: свой `id` поля контрола или `controlId`; у группы — нет:
	 * `for` называет только labelable-элемент.
	 */
	private _forOf(control: IFieldControlInfo | null): string | null {
		if (control === null) return this._controlId
		if (!control.labelable) return null

		return control.id ?? this._controlId
	}

	private _relink(field: IField): void {
		const links = this._linksOf(field)
		const current = this._links

		if (links.labelledBy === current.labelledBy && links.describedBy === current.describedBy) {
			return
		}

		this._links = links
		this.events.emit('change:links', links)
	}

	/** Ссылки — на части, которые рисуются: подпись с текстом и видимую справку. */
	private _linksOf(field: IField): IFieldLinks {
		return {
			labelledBy: field.label !== '' ? this._labelId : undefined,
			describedBy: this._describedByOf(field),
		}
	}

	/** Видимая справка: ошибка, а без неё — подсказка. */
	private _describedByOf(field: IField): string | undefined {
		if (field.errorRendered) return this._errorId
		if (field.helperRendered) return this._helperId

		return undefined
	}
}
