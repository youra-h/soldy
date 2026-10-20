import type { IComponentView, TDefaultValues } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import type {
	IAriaLinks,
	IAriaParts,
	IAriaPluginOptions,
	IAriaPluginProps,
	TAriaPluginEvents,
} from './types'

/** Ссылок от разметки вокруг нет. */
const NO_LINKS: IAriaLinks = {}

/** Ссылок на свои части нет. */
const NO_PARTS: IAriaParts = {}

/** Те же ли ссылки — по содержимому: связка пишет новый объект на каждую смену. */
function sameLinks(a: IAriaLinks, b: IAriaLinks): boolean {
	return a.labelledBy === b.labelledBy && a.describedBy === b.describedBy
}

/**
 * TAriaPlugin — доступное имя и описание компонента.
 *
 * Почему плагин, а не свойства `TComponentView`. Имя нужно не всякому
 * компоненту, а только тому, у кого нет подходящего видимого текста:
 * иконочной кнопке, индикатору выполнения, диалогу, полю ввода. У кнопки с
 * текстом, у заголовка или обёртки имя вычисляется из содержимого само, и
 * лишние `label`/`labelledBy` на базовом классе были бы мусором в каждом
 * наследнике.
 * Поэтому подключается по необходимости — как `TActionPlugin`.
 *
 * Почему плагин здесь годится, хотя обычно для ARIA не годится. Плагин,
 * который писал бы атрибуты прямо в DOM после монтирования, дал бы пустую
 * серверную разметку. Этот в DOM не ходит: он пишет в `instance.aria` — тот же
 * набор, что заполняют ядро и расширения коллекции, — а раскладывает набор
 * шаблон, синхронно.
 *
 * Входов у плагина три: пропсы (`aria_label`, `aria_labelledBy`,
 * `aria_describedBy`) — их задаёт разметка компонента, — ссылки от разметки
 * вокруг (`links`) — их пишет поле формы `Field` своему контролу — и ссылки
 * на части своей разметки (`parts`) — их пишет плагин связок компонента
 * (счётчик символов Textarea). Сливает их плагин: подпись поля — имя, пока
 * своего нет, а в `aria-describedby` встают по порядку пояснение поля, свои
 * части и своё пояснение. Второго писателя тех же атрибутов нет, и ни один
 * вход не стирает другой.
 */
export class TAriaPlugin extends TBasePlugin<any, TAriaPluginEvents> {
	/**
	 * Умолчания пропов — «имени нет». Объявлены ключами без значения, как
	 * `closable` у элемента Tabs: значим ключ, а не значение. Снятый из разметки
	 * проп связка возвращает к умолчанию декларации, и без ключа у компонента
	 * оставалось бы прежнее имя. В декларацию их кладёт `definePlugin` — см.
	 * `TAnchorPlugin.defaultValues`.
	 */
	static defaultValues: TDefaultValues<
		IAriaPluginProps,
		never,
		'label' | 'labelledBy' | 'describedBy'
	> = {
		label: undefined,
		labelledBy: undefined,
		describedBy: undefined,
	}

	private _instance: IComponentView | null = null
	private _label = TAriaPlugin.defaultValues.label
	private _labelledBy = TAriaPlugin.defaultValues.labelledBy
	private _describedBy = TAriaPlugin.defaultValues.describedBy
	private _links: IAriaLinks = NO_LINKS
	private _parts: IAriaParts = NO_PARTS
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

	/**
	 * Ссылки от разметки вокруг — подпись и пояснение поля формы. Не проп: в
	 * контракт плагина не входит, пишет его связка поля с контролом
	 * (`TFieldControlExtension`), а не разметка компонента.
	 *
	 * - `labelledBy` — имя, пока своего нет: своё (`label`, `labelledBy`)
	 *   главнее, иначе подпись поля перекрыла бы имя, которое задал
	 *   потребитель;
	 * - `describedBy` — перед своим: `aria-describedby` получает оба `id`,
	 *   пояснение поля — первым.
	 *
	 * Объект заменяется целиком, а не правится на месте.
	 */
	get links(): IAriaLinks {
		return this._links
	}

	set links(value: IAriaLinks) {
		if (sameLinks(value, this._links)) return

		this._links = value
		this._apply()
	}

	/**
	 * Ссылки на части своей разметки — часть без своего экземпляра, которая
	 * поясняет компонент: счётчик символов Textarea. Не проп: в контракт
	 * плагина не входит, как и `links`, — пишет его плагин связок компонента,
	 * который знает `id` части, а не разметка.
	 *
	 * Только пояснение: `describedBy` встаёт в `aria-describedby` после
	 * пояснения поля формы и перед своим. Так части звучат на фокусе
	 * компонента, вместе с ним, а не живым регионом на каждое изменение.
	 *
	 * Объект заменяется целиком, а не правится на месте.
	 */
	get parts(): IAriaParts {
		return this._parts
	}

	set parts(value: IAriaParts) {
		if (value.describedBy === this._parts.describedBy) return

		this._parts = value
		this._apply()
	}

	/**
	 * Есть ли у компонента имя из этого плагина — своё или подпись поля.
	 * Описание именем не считается.
	 */
	get named(): boolean {
		return !!(this._label || this._labelledBy || this._links.labelledBy)
	}

	/** Пишет свою часть в общий набор компонента. */
	private _apply(): void {
		const aria = this._instance?.aria

		if (!aria) return

		// Своё имя главнее подписи поля: `aria-labelledby` перекрыл бы `aria-label`
		const labelledBy = this._labelledBy || (this._label ? undefined : this._links.labelledBy)
		// Пояснения — от внешнего к своему: справка поля, свои части, своё
		const describedBy = [this._links.describedBy, this._parts.describedBy, this._describedBy]
			.filter(Boolean)
			.join(' ')

		aria.add('aria-label', this._label || null)
		aria.add('aria-labelledby', labelledBy || null)
		aria.add('aria-describedby', describedBy || null)

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
		this._links = NO_LINKS
		this._parts = NO_PARTS
		this._role = undefined

		super.destroy()
	}
}
