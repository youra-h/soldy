/**
 * Хост, который отдаёт написанное на нём своему внутреннему узлу, — запись
 * реестра (`TForwardRegistry`).
 *
 * Компилятор Vue собирает всё, что потребитель написал на компоненте, в объект
 * и отдаёт его компоненту (`$attrs`), а компилятор Angular превращает привязки
 * `[attr.x]` и `[x]` и слушатели `(x)` на элементе в прямые команды рендереру
 * шаблона потребителя: компонент их не видит. Поэтому у поля, элемента
 * коллекции, ListBox, Tabs и таблицы, где написанное на компоненте относится к
 * узлу внутри (`<input>`, строке, узлу списка, `table`), его доносит рендерер
 * адаптера (`TForwardingRenderer`): находит хост в реестре и отдаёт команду его
 * записи. Запись ставит значение на узел, когда он есть, и держит у себя, пока
 * его нет: слушатели и первые привязки приходят раньше, чем Angular отрисовал
 * шаблон компонента.
 *
 * Запись помнит последнее: у атрибута — значение или «снят» (`null` привязки),
 * у свойства — значение, у слушателя — где он стоит, у класса — стоит ли он, у
 * свойства стиля — значение или «снято». Сменился узел — всё переезжает на
 * новый, а со старого снимаются атрибуты, классы, стиль и слушатели; снятый
 * хост снимает слушатели с узла, и они больше не зовутся.
 *
 * На хосте остаётся то, что относится к нему самому: служебные атрибуты
 * Angular и метки soldy (`marksHost`), входы компонента, его выходы `so*`,
 * события движения и синтетика старых анимаций — и вид, класс и стиль, у
 * хоста с коробкой: поля, окна таблицы (`staysOnHost`). У хоста без коробки
 * (`boxless` — обёртка, чей корень уехал в слой: регион тостов) внешний узел
 * компонента — корень внутри, и класс со стилем, привязки (`[class.x]`,
 * `[style.x]`, `[ngClass]`) тоже, уходят на него. Правило — у записи хоста, а
 * не в общем правиле атрибута: какой у хоста вид, решает его компонент.
 * Статические атрибуты разметки сюда не попадают: Angular ставит их ещё до
 * конструктора компонента, и переносит их база
 * (`TComponentBase._moveAttributes`) — по тому же правилу, что у его записи, и
 * тем же рендерером адаптера.
 *
 * **Цепочка хостов.** Узел записи бывает сам хостом из реестра: поле Select —
 * `<div so-input>`, у которого свой `<input>`. Пишет запись через рендерер
 * адаптера, который пришёл с командой, а он команду на такой узел отдаёт его
 * записи — по её правилам. Так написанное на Select доходит до `<input>` поля,
 * а на каждом звене остаётся то, что звено держит у себя. Снятие и переезд на
 * новый узел — тем же путём.
 *
 * **Набор на хосте.** Директива набора (`[so-attributes]`) на хосте из реестра
 * отдаёт набор его записи (`setMarkup`): всё, что написано на хосте, — узлу, и
 * набор тоже, как `v-bind` на `<Input>` у Vue. Запись кладёт его на свой узел
 * слоем `forwarded` раскладчика узла (`TElementAttributes`) — поверх набора,
 * который на узел кладёт шаблон самого компонента (`markup`): `aria` Select
 * ложится на `<input>` поверх набора комбобокса поля. Пока узла нет, набор
 * ждёт его, а сменился узел — уходит со старого на новый. Узел — сам хост:
 * сумму запись отдаёт его записи (`receive`), и та кладёт её поверх своего
 * набора — на общем имени главнее набор внешнего звена.
 */

import type { Renderer2, RendererStyleFlags2 } from '@angular/core'
import { TElementAttributes, attributesOf } from '../runtime/root-attributes'

/** Обработчик события — как его принимает `Renderer2.listen`. */
export type TListenerCallback = Parameters<Renderer2['listen']>[2]

/** Параметры слушателя — как их принимает `Renderer2.listen`. */
export type TListenerOptions = Parameters<Renderer2['listen']>[3]

/** Как хост отдаёт написанное на нём узлу внутри — см. `TForwardRegistry.register`. */
export type TForwardOptions = {
	/**
	 * Своей коробки у хоста нет (`display: contents`): внешний узел компонента —
	 * узел внутри, и класс со стилем потребителя — тоже его. Обёртка региона
	 * тостов. Нет — хост с коробкой: класс и стиль остаются на нём.
	 */
	readonly boxless?: boolean
}

/**
 * Вид хоста — класс и стиль, строчными, как их хранит документ: их читает
 * тема у внешнего узла компонента. У хоста с коробкой они остаются на нём.
 */
const LOOK_ATTRIBUTES: ReadonlySet<string> = new Set(['class', 'style'])

/**
 * Служебные атрибуты Angular, строчными: они метят сам хост, с коробкой он или
 * без. `ngh` — пометка гидратации компонента (увезённая на поле, она ломала
 * гидратацию: Angular не узнавал компонент и рисовал второе поле),
 * `ng-version` и `ng-server-context` — корневой компонент, `ngskiphydration` —
 * хост без гидратации, `jsaction` — события, которые сервер просит повторить.
 */
const SERVICE_ATTRIBUTES: ReadonlySet<string> = new Set([
	'ngh',
	'ng-version',
	'ng-server-context',
	'ngskiphydration',
	'jsaction',
])

/**
 * Начала имён атрибутов хоста: значения входов в режиме разработки
 * (`ng-reflect-*`), инкапсуляция стилей (`_nghost-*`, `_ngcontent-*`) и метки
 * soldy — селектор компонента (`so-input`) и директивы адаптера: они метят
 * элемент для Angular, узлу шаблона они ни к чему.
 */
const HOST_PREFIXES: readonly string[] = ['ng-reflect-', '_ng', 'so-']

/**
 * Свойство вида хоста, которое у хоста с коробкой не уходит на узел: класс,
 * как атрибут `class`.
 */
const LOOK_PROPERTIES: ReadonlySet<string> = new Set(['className'])

/**
 * Синтетическое имя старых анимаций Angular — свойство `[@fade]` и слушатель
 * `(@fade.done)`: анимирует их рендерер анимаций на том элементе, где их
 * написали, — на хосте.
 */
const SYNTHETIC_PREFIX = '@'

/**
 * События, которые остаются на хосте:
 *
 * - выход компонента — `so` и имя события ядра в camelCase (`soActionFocus`):
 *   на `(soActionFocus)` Angular подписывается и на выход, и на событие DOM с
 *   тем же именем, и оба относятся к компоненту, а не к его узлу;
 * - движение — `animation*` и `transition*`: их шлёт элемент, который
 *   движется, а тема двигает корень и его части. На хосте их слушает и сам
 *   Angular — `animate.enter` и `animate.leave` узнают так, что движение
 *   хоста кончилось, — и на узле внутри он бы этого не услышал никогда.
 *   Движение частей до хоста всплывает само.
 */
const HOST_EVENT = /^(so[A-Z]|animation|transition)/

/**
 * Атрибут метит сам хост — служебный атрибут Angular или метка soldy — и
 * остаётся на любом хосте, с коробкой или без.
 */
export function marksHost(name: string): boolean {
	const lower = name.toLowerCase()

	return SERVICE_ATTRIBUTES.has(lower) || HOST_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

/**
 * Атрибут остаётся на хосте с коробкой, а не уходит на внутренний узел: вид
 * хоста (класс, стиль) или его метка (`marksHost`). Одно правило для
 * статических атрибутов разметки, которые переносит база, и для привязок,
 * которые доносит рендерер адаптера.
 */
export function staysOnHost(name: string): boolean {
	return LOOK_ATTRIBUTES.has(name.toLowerCase()) || marksHost(name)
}

/** Атрибут, который потребитель привязал к хосту: последнее значение, `null` — снят. */
type TForwardedAttribute = {
	readonly renderer: Renderer2
	readonly name: string
	readonly namespace: string | null | undefined
	readonly value: string | null
}

/** Свойство, которое потребитель привязал к хосту, — последнее значение. */
type TForwardedProperty = {
	readonly renderer: Renderer2
	readonly value: unknown
}

/**
 * Класс, который привязка поставила хосту без коробки или сняла с него, —
 * последнее: стоит ли он (`[class.x]`, `[ngClass]`).
 */
type TForwardedClass = {
	readonly renderer: Renderer2
	readonly on: boolean
}

/** Флаги свойства стиля — как их принимает `Renderer2.setStyle`. */
type TStyleFlags = RendererStyleFlags2 | undefined

/**
 * Свойство стиля, которое привязка поставила хосту без коробки или сняла с
 * него (`[style.x]`, `[ngStyle]`), — последнее: значение или «снято», с
 * флагами рендерера (имя через дефис, `!important`).
 */
type TForwardedStyle =
	| {
			readonly renderer: Renderer2
			readonly flags: TStyleFlags
			readonly set: true
			readonly value: unknown
	  }
	| { readonly renderer: Renderer2; readonly flags: TStyleFlags; readonly set: false }

/**
 * Слушатель, которым потребитель слушает хост: ставится на узел и снимается с
 * него рендерером, через который пришёл, — тем же путём, что слушатель
 * Angular на обычном элементе (`EventManager`, его плагины клавиш).
 */
class TForwardedListener {
	/** Снять слушатель с узла, где он стоит; не стоит — `null`. */
	private _off: (() => void) | null = null

	constructor(
		private readonly _renderer: Renderer2,
		private readonly _event: string,
		private readonly _callback: TListenerCallback,
		private readonly _options: TListenerOptions,
	) {}

	/** Слушать узел. */
	on(node: Element): void {
		this._off = this._renderer.listen(node, this._event, this._callback, this._options)
	}

	/** Снять с узла, где слушает; не слушает — ничего. */
	off(): void {
		this._off?.()
		this._off = null
	}
}

/** Ключ атрибута в записи: одно имя в разных пространствах — разные атрибуты. */
function attributeKey(name: string, namespace: string | null | undefined): string {
	return `${namespace ?? ''}|${name}`
}

/** Набора нет — один пустой на всех: снятый слой раскладчик снимает с узла. */
const NO_SET: object = Object.freeze({})

/** Запись хоста по узлу — у реестра: узел записи бывает хостом сам. */
export type THostLookup = (node: Element) => TForwardedHost | undefined

/** Запись хоста в реестре — см. шапку. */
export class TForwardedHost {
	/** Внутренний узел, куда ложится написанное на хосте; до отрисовки — `null`. */
	private _node: Element | null = null

	/** Компонент снят: узла больше нет, и записывать некуда. */
	private _released = false

	private readonly _attributes = new Map<string, TForwardedAttribute>()
	private readonly _properties = new Map<string, TForwardedProperty>()
	private readonly _classes = new Map<string, TForwardedClass>()
	private readonly _styles = new Map<string, TForwardedStyle>()
	private readonly _listeners = new Set<TForwardedListener>()

	/** Набор, который разметка владельца положила на хост (`[so-attributes]`). */
	private _markup: object = NO_SET

	/** Набор, который отдала запись внешнего звена: её узел — этот хост. */
	private _received: object = NO_SET

	/** Сумма наборов — то, что уходит на узел; внешний главнее на общем имени. */
	private _set: object = NO_SET

	/**
	 * @param _own имена входов компонента и `ctrl`, строчными: атрибут с именем
	 *   входа — запись входа, а не атрибут поля, и остаётся на хосте
	 * @param _boxless своей коробки у хоста нет: класс и стиль — тоже узлу внутри
	 *   (`TForwardOptions.boxless`)
	 * @param _hostOf запись хоста по узлу — у реестра: узел записи бывает хостом
	 *   сам, и набор тогда уходит его записи
	 * @param _onRelease снять хост с реестра
	 */
	constructor(
		private readonly _own: ReadonlySet<string>,
		private readonly _boxless: boolean,
		private readonly _hostOf: THostLookup,
		private readonly _onRelease: () => void,
	) {}

	/**
	 * Класс и стиль остаются на хосте: это его вид, у хоста с коробкой. У хоста
	 * без коробки их команды (`addClass`, `setStyle`) рендерер отдаёт записи.
	 */
	get keepsLook(): boolean {
		return !this._boxless
	}

	/** Атрибут остаётся на хосте. */
	keepsAttribute(name: string): boolean {
		const stays = this._boxless ? marksHost(name) : staysOnHost(name)

		return stays || this._own.has(name.toLowerCase())
	}

	/** Свойство остаётся на хосте. */
	keepsProperty(name: string): boolean {
		return (
			name.startsWith(SYNTHETIC_PREFIX) ||
			(this.keepsLook && LOOK_PROPERTIES.has(name)) ||
			this._own.has(name.toLowerCase())
		)
	}

	/** Слушатель остаётся на хосте: выход компонента, движение, старые анимации. */
	keepsListener(event: string): boolean {
		return event.startsWith(SYNTHETIC_PREFIX) || HOST_EVENT.test(event)
	}

	setAttribute(
		renderer: Renderer2,
		name: string,
		value: string,
		namespace: string | null | undefined,
	): void {
		this._attributes.set(attributeKey(name, namespace), { renderer, name, namespace, value })

		if (this._node) renderer.setAttribute(this._node, name, value, namespace)
	}

	removeAttribute(renderer: Renderer2, name: string, namespace: string | null | undefined): void {
		this._attributes.set(attributeKey(name, namespace), {
			renderer,
			name,
			namespace,
			value: null,
		})

		if (this._node) renderer.removeAttribute(this._node, name, namespace)
	}

	setProperty(renderer: Renderer2, name: string, value: unknown): void {
		this._properties.set(name, { renderer, value })

		if (this._node) renderer.setProperty(this._node, name, value)
	}

	/** Класс хоста без коробки — на узел (`keepsLook`). */
	addClass(renderer: Renderer2, name: string): void {
		this._classes.set(name, { renderer, on: true })

		if (this._node) renderer.addClass(this._node, name)
	}

	/** Снятый класс хоста без коробки — с узла и снятым ждёт новый узел. */
	removeClass(renderer: Renderer2, name: string): void {
		this._classes.set(name, { renderer, on: false })

		if (this._node) renderer.removeClass(this._node, name)
	}

	/** Свойство стиля хоста без коробки — на узел (`keepsLook`). */
	setStyle(renderer: Renderer2, style: string, value: unknown, flags: TStyleFlags): void {
		this._styles.set(style, { renderer, flags, set: true, value })

		if (this._node) renderer.setStyle(this._node, style, value, flags)
	}

	/** Снятое свойство стиля хоста без коробки — с узла и снятым ждёт новый узел. */
	removeStyle(renderer: Renderer2, style: string, flags: TStyleFlags): void {
		this._styles.set(style, { renderer, flags, set: false })

		if (this._node) renderer.removeStyle(this._node, style, flags)
	}

	/**
	 * Слушатель потребителя — на узел, а нет узла — ждёт его. Отписка снимает
	 * слушатель там, где он стоит, и работает в любом порядке со снятием
	 * компонента.
	 */
	listen(
		renderer: Renderer2,
		event: string,
		callback: TListenerCallback,
		options: TListenerOptions,
	): () => void {
		const listener = new TForwardedListener(renderer, event, callback, options)

		this._listeners.add(listener)

		if (this._node) listener.on(this._node)

		return () => {
			listener.off()
			this._listeners.delete(listener)
		}
	}

	/**
	 * Набор, который разметка владельца положила на хост (`[so-attributes]`), —
	 * узлу, слоем `forwarded`: что называет набор, ложится туда же, куда
	 * остальное, написанное на хосте. Пока узла нет — ждёт его.
	 */
	setMarkup(set: object): void {
		this._markup = attributesOf(set)
		this._sum()
	}

	/**
	 * Набор, который отдала запись внешнего звена цепочки: её узел — этот хост
	 * (поле `<div so-input>` в шаблоне Select). Ложится поверх своего набора
	 * хоста и уходит дальше, на узел. Пустой — внешнее звено ушло с хоста.
	 */
	receive(set: object): void {
		this._received = attributesOf(set)
		this._sum()
	}

	/**
	 * Внутренний узел — отрисованный или новый: написанное на хосте ложится на
	 * него, а со старого снимаются атрибуты, классы, стиль, слушатели и набор.
	 * Свойство со старого не снять — его значение там и остаётся, как у узла,
	 * который Angular убрал.
	 */
	attach(node: Element | null): void {
		if (this._released || node === this._node) return

		if (this._node) this._detach(this._node)

		this._node = node

		if (node) this._apply(node)
	}

	/** Компонент снят: слушатели — с узла, хост — с реестра. */
	release(): void {
		if (this._released) return

		for (const listener of this._listeners) listener.off()

		this._listeners.clear()
		this._node = null
		this._released = true
		this._onRelease()
	}

	/**
	 * Сумма наборов: свой набор хоста, поверх него — набор внешнего звена. Что не
	 * строкой, имени не называет и своего не перекрывает, как у слоёв
	 * раскладчика. Считается на смену одного из наборов, а раскладчик узла
	 * пишет по своей памяти только сменившееся.
	 */
	private _sum(): void {
		const sum: Record<string, string> = {}

		for (const set of [this._markup, this._received]) {
			for (const [name, value] of Object.entries(set)) {
				if (typeof value === 'string') sum[name] = value
			}
		}

		this._set = sum

		if (this._node) this._send(this._node, sum)
	}

	/**
	 * Набор — узлу: на его раскладчик слоем `forwarded`, а у узла-хоста — его
	 * записи, следующему звену.
	 */
	private _send(node: Element, set: object): void {
		const next = this._hostOf(node)

		if (next) next.receive(set)
		else TElementAttributes.of(node).set('forwarded', set)
	}

	private _apply(node: Element): void {
		// Набор — раньше привязок: на общем имени при первой раскладке главнее
		// написанное потребителем, как `controlAttrs` поверх `aria` у Vue
		if (this._set !== NO_SET) this._send(node, this._set)

		for (const { renderer, name, namespace, value } of this._attributes.values()) {
			if (value === null) renderer.removeAttribute(node, name, namespace)
			else renderer.setAttribute(node, name, value, namespace)
		}

		for (const [name, { renderer, value }] of this._properties) {
			renderer.setProperty(node, name, value)
		}

		for (const [name, { renderer, on }] of this._classes) {
			if (on) renderer.addClass(node, name)
			else renderer.removeClass(node, name)
		}

		for (const [name, style] of this._styles) {
			if (style.set) style.renderer.setStyle(node, name, style.value, style.flags)
			else style.renderer.removeStyle(node, name, style.flags)
		}

		for (const listener of this._listeners) listener.on(node)
	}

	private _detach(node: Element): void {
		if (this._set !== NO_SET) this._send(node, NO_SET)

		for (const { renderer, name, namespace, value } of this._attributes.values()) {
			if (value !== null) renderer.removeAttribute(node, name, namespace)
		}

		for (const [name, { renderer, on }] of this._classes) {
			if (on) renderer.removeClass(node, name)
		}

		for (const [name, style] of this._styles) {
			if (style.set) style.renderer.removeStyle(node, name, style.flags)
		}

		for (const listener of this._listeners) listener.off()
	}
}
