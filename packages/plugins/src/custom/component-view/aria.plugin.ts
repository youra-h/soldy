import type { IComponentView } from '@soldy/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import type { IAriaPluginOptions, TAriaPluginEvents } from './types'

/**
 * TAriaPlugin — доступное имя и описание компонента.
 *
 * Почему плагин, а не свойства `TComponentView`. Имя нужно не всякому
 * компоненту, а только тому, у кого нет подходящего видимого текста:
 * иконочной кнопке, спиннеру, диалогу, полю ввода. У кнопки с текстом, у
 * заголовка или обёртки имя вычисляется из содержимого само, и лишние
 * `label`/`labelledBy` на базовом классе были бы мусором в каждом наследнике.
 * Поэтому подключается по необходимости — как `TActionPlugin`.
 *
 * Почему плагин здесь годится, хотя обычно для ARIA не годится. Плагин,
 * который писал бы атрибуты прямо в DOM после монтирования, дал бы пустую
 * серверную разметку. Этот в DOM не ходит: он пишет в `instance.aria` — тот же
 * набор, что заполняют ядро и расширения коллекции, — а раскладывает набор
 * шаблон, синхронно.
 */
export class TAriaPlugin extends TBasePlugin<any, TAriaPluginEvents> {
	private _instance: IComponentView | null = null
	private _label: string | undefined
	private _labelledBy: string | undefined
	private _describedBy: string | undefined
	private _role: string | undefined

	override install(ctx: IPluginContext, options?: IAriaPluginOptions): void {
		super.install(ctx, options)

		this._instance = ctx.getInstance<IComponentView>()
		this._role = options?.role

		this._apply()
	}

	/**
	 * Доступное имя.
	 *
	 * Пустая строка приравнена к отсутствию: `aria-label=""` имени не даёт, но
	 * глушит вычисление имени из содержимого — хуже, чем не ставить атрибут.
	 */
	get label(): string | undefined {
		return this._label
	}

	set label(value: string | undefined) {
		if (this._label === value) return

		this._label = value
		this._apply()
		this.events.emit('change:label', value)
	}

	/**
	 * `id` элемента, чей текст служит именем. Приоритетнее `label` — так решает
	 * сам алгоритм вычисления имени в браузере, и мы ему не противоречим.
	 */
	get labelledBy(): string | undefined {
		return this._labelledBy
	}

	set labelledBy(value: string | undefined) {
		if (this._labelledBy === value) return

		this._labelledBy = value
		this._apply()
		this.events.emit('change:labelledBy', value)
	}

	/** `id` элемента с пояснением: подсказка под полем, текст ошибки. */
	get describedBy(): string | undefined {
		return this._describedBy
	}

	set describedBy(value: string | undefined) {
		if (this._describedBy === value) return

		this._describedBy = value
		this._apply()
		this.events.emit('change:describedBy', value)
	}

	/** Есть ли у компонента имя из этого плагина. Описание именем не считается. */
	get named(): boolean {
		return !!(this._label || this._labelledBy)
	}

	/** Пишет свою часть в общий набор компонента. */
	private _apply(): void {
		const aria = this._instance?.aria

		if (!aria) return

		aria.add('aria-label', this._label || null)
		aria.add('aria-labelledby', this._labelledBy || null)
		aria.add('aria-describedby', this._describedBy || null)

		if (!this._role) return

		// Роль задана — значит без имени элемент декоративен (так у Icon).
		// Именованный не может оставаться скрытым: скрытый не участвует в
		// вычислении имени, и одно отменило бы другое. Обе стороны здесь, а не
		// пополам с ядром: иначе при снятии имени было бы неясно, кому
		// возвращать `aria-hidden`.
		aria.add('role', this.named ? this._role : null)
		aria.add('aria-hidden', this.named ? null : 'true')
	}

	override destroy(): void {
		this._instance = null
		this._label = undefined
		this._labelledBy = undefined
		this._describedBy = undefined
		this._role = undefined

		super.destroy()
	}
}
