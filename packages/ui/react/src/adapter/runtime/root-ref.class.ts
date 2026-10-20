/**
 * TRootRef — ref корня компонента: узел привязывается к `TElementPlugin`
 * контекста, и тот же узел получает `ref` потребителя.
 *
 * `ref` потребителя (`<Button ref={button}>`) получает корень компонента —
 * узел, на который ложатся его класс и атрибуты. У поля (Input, CheckBox,
 * Switch, RadioGroup.Item) — тоже корень, а не `<input>`: от корня до поля
 * потребитель дойдёт `querySelector`, а от поля до корня — только по
 * родителям, и этот путь ломается при каждой правке разметки.
 *
 * В React 19 `ref` — обычный проп компонента, а у узла `ref` один, и ставит
 * его узлу адаптер: без привязки к `TElementPlugin` не пришло бы
 * `element:ready`. Поэтому потребителю узел отдаёт сам ref корня (`attach`) —
 * тем же вызовом и после привязки — так, как отдал бы его React: функции —
 * узлом, а при снятии — её очисткой (React 19) или, без очистки, `null`;
 * объекту — в `current`, при снятии — `null`.
 *
 * Ref корня у контекста один и между рендерами не меняется: новую функцию
 * React снял бы с узла и привязал заново, и `TElementPlugin` объявил бы тот же
 * узел парой `removed` + `ready`. Поэтому `ref` потребителя, сменившийся между
 * рендерами, ведёт сам класс: адаптер сообщает ему `ref` каждого коммита
 * раньше, чем React привязывает ref узлов (`consume`), — ref корня того же
 * коммита отдаёт узел уже новому, — и сверяет после привязки (`sync`): если
 * узел остался прежним, а сменился только `ref` потребителя, прежнему узел
 * отпускается, новому — отдаётся.
 *
 * Корень внутри обёртки (окно таблицы, `toWrappedRootProps`) потребителю не
 * отдаётся: его `ref` получает обёртка — внешний узел, куда легли класс и
 * атрибуты потребителя, — и ставит его там React, как любой атрибут. Такому
 * корню — `bind`: только привязка к `TElementPlugin`.
 *
 * **Корень значением.** Разметке, которой корень нужен значением рендера, —
 * Popover и Tooltip отдают его своему Frame якорем, — ref корня отдаёт узел
 * подпиской (`TRootSource`: `subscribe` и `getSnapshot`), её читает хук
 * `useRootElement`. Снимок — тот же узел, что ref корня получил от React и
 * отдал потребителю: своё хранилище было бы вторым путём к нему. Подписчиков
 * ref оповещает, только когда сменился сам узел, — смена `ref` потребителя их
 * не трогает. Подписан только тот, кто корень значением читает, и множество
 * подписчиков заводится с первым из них: у строк таблицы и их чекбоксов его
 * нет. Корень внутри обёртки (`bind`) значением не отдаётся: снаружи от него
 * видна обёртка.
 *
 * Уничтоженный контекст ref отпускает — и его, и `ref` потребителя, и
 * подписчиков корня: узел, ещё отданный потребителю, отпускается, и ссылок не
 * остаётся ни на кого из них. Ref React хранит в узле своего дерева (fiber), и
 * снятый узел живёт дольше размонтирования: событийная система React DOM
 * помнит узел последнего события до следующего события на странице
 * (`return_targetInst`). У снятого узла React чистит пропсы, состояние и
 * эффекты, но не `ref` — и ref, замкнутый на контекст, держал бы через него
 * размонтированный компонент целиком: у таблицы — все строки с записями.
 * Привязывать к уничтоженному контексту нечего: его набор плагинов уничтожен
 * вместе с ним, — и отдавать потребителю тоже: пересобранный компонент
 * (StrictMode, `<Activity>`) отдаст ему корень своим контекстом.
 *
 * Классом, а не замыканием в `useAdapter`: замыкание держит всю область
 * вызова, где его создали, а область `useAdapter` держит ещё пропсы и связку
 * своего рендера, — через них компонент остался бы досягаем и после того, как
 * ref отпустил контекст.
 *
 * Уничтожение класс слышит слушателем всех событий шины контекста (`listen`),
 * а не подпиской `on('destroy')`: слушатель шине — массив из одного элемента,
 * а подписка заводит ей карту наборов, у таблицы — по карте на контекст
 * каждой строки и каждого её чекбокса.
 */

import type { Ref } from 'react'
import type { IAdapterContext } from '@soldy-ui/setup'

/**
 * `ref` потребителя: функция — в React 19 и с очисткой — или объект
 * `{ current }`.
 *
 * Узел — `Element`, а не `HTMLElement`: `tag` свободен, и корнем бывает
 * `<svg>` (иконка по роли). Свой `ref` потребитель объявляет узлом, которого
 * ждёт, — `useRef<HTMLButtonElement>(null)` сюда подходит.
 */
export type TConsumerRef = Ref<Element> | undefined

/**
 * Корень компонента значением — только для чтения: подписка на смену узла и
 * снимок, как их ждёт `useSyncExternalStore`. Читает его `useRootElement`, а
 * узел ставит ref корня, а не тот, кто подписан.
 */
export type TRootSource = {
	/** Подписка на смену корня; отдаёт отписку. */
	readonly subscribe: (listener: () => void) => () => void
	/** Корень сейчас: до коммита, после снятия и у уничтоженного — `null`. */
	readonly getSnapshot: () => Element | null
}

/** Отписка уничтоженного ref: подписчика он не заводил. */
const unsubscribed = (): void => {}

/** Функция или объект `{ current }` — то, что React принимает как `ref`. */
function isConsumerRef(value: unknown): value is NonNullable<TConsumerRef> {
	return (
		typeof value === 'function' ||
		(typeof value === 'object' && value !== null && 'current' in value)
	)
}

/**
 * `ref` потребителя из пропсов компонента: в React 19 это обычный проп. У
 * пропсов сборки без своего узла (`useSetupControl`, Virtual) его нет вовсе.
 */
export function consumerRefOf(props: object): TConsumerRef {
	const ref: unknown = Reflect.get(props, 'ref')

	return isConsumerRef(ref) ? ref : undefined
}

/** Узел, отданный `ref` потребителя, и как его отпустить. */
type TGiven = {
	readonly ref: NonNullable<TConsumerRef>
	readonly node: Element
	readonly release: () => void
}

/**
 * Отдать узел `ref` потребителя так, как отдал бы React, — и вернуть, как его
 * отпустить: очисткой, которую вернула функция, `null` функции без очистки,
 * `null` в `current` объекта.
 */
function give(ref: NonNullable<TConsumerRef>, node: Element): () => void {
	if (typeof ref === 'function') {
		const cleanup = ref(node)

		return typeof cleanup === 'function' ? cleanup : () => ref(null)
	}

	ref.current = node

	return () => {
		ref.current = null
	}
}

export class TRootRef implements TRootSource {
	/** Контекст корня; уничтожен — `null`, и ref больше ничего не делает. */
	private _context: IAdapterContext | null
	/** Корень, который ref корня получил от React последним; снят — `null`. */
	private _node: Element | null = null
	/** `ref` потребителя последнего коммита. */
	private _consumer: TConsumerRef = undefined
	/** Какой узел и какому `ref` потребителя отдан. */
	private _given: TGiven | null = null
	/** Подписчики смены корня; заводятся с первым — у большинства компонентов их нет. */
	private _listeners: Set<() => void> | null = null

	constructor(adapter: IAdapterContext) {
		this._context = adapter

		adapter.events.listen((event) => {
			if (event === 'destroy') this._destroy()
		})
	}

	/** Ref корня: привязка к `TElementPlugin`, затем тот же узел — `ref` потребителя. */
	readonly attach = (element: Element | null): void => {
		if (!this._context) return

		const changed = element !== this._node

		this._context.bindElement(element)
		this._node = element
		this.sync()

		// Подписчикам — после привязки: корень, который они прочтут, уже у плагинов
		if (changed) this._listeners?.forEach((listener) => listener())
	}

	/**
	 * Подписка на смену корня (`TRootSource`). Стрелка: её отдают
	 * `useSyncExternalStore` без `this`. Уничтоженный подписчика не заводит:
	 * узла у него больше не будет.
	 */
	readonly subscribe = (listener: () => void): (() => void) => {
		if (!this._context) return unsubscribed

		this._listeners ??= new Set()
		this._listeners.add(listener)

		return () => {
			this._listeners?.delete(listener)
		}
	}

	/** Корень сейчас (`TRootSource`). Стрелка — по той же причине, что `subscribe`. */
	readonly getSnapshot = (): Element | null => this._node

	/** Ref корня внутри обёртки: только привязка — `ref` потребителя получает обёртка. */
	readonly bind = (element: Element | null): void => {
		this._context?.bindElement(element)
	}

	/** `ref` потребителя коммита — раньше, чем React привяжет ref узлов. */
	consume(ref: TConsumerRef): void {
		if (this._context) this._consumer = ref
	}

	/**
	 * Отдать узел `ref` потребителя, когда сменился узел или сам `ref`:
	 * прежнему — отпустить, новому — отдать. Ничего не сменилось — ничего не
	 * зовётся.
	 */
	sync(): void {
		const node = this._node
		const ref = this._consumer
		const given = this._given

		if (given && given.ref === ref && given.node === node) return

		this._given = null
		given?.release()

		if (node && ref) this._given = { ref, node, release: give(ref, node) }
	}

	/**
	 * Контекст уничтожен: узел отпускается, ссылок на контекст, потребителя и
	 * подписчиков не остаётся. Подписчиков не оповещают: компонент или снят,
	 * или собирается заново — со своим ref корня.
	 */
	private _destroy(): void {
		this._context = null
		this._node = null
		this._consumer = undefined
		this._listeners = null
		this.sync()
	}
}
