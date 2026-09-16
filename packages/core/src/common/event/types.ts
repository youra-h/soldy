/**
 * Констрейнт карты событий: «у тебя есть карта», а не «ровно такая».
 *
 * Открыт индексной сигнатурой, поэтому годится только в констрейнт дженерика
 * (`TEvents extends TAnyEvents`). Картой он быть не может: карта, которая его
 * пересечёт или им станет, получит `keyof` = `string` и начнёт принимать в
 * `on`, `emit` и `relay` любое имя с любым обработчиком. Карты событий
 * закрыты — см. `TComponentEvents`.
 */
export type TAnyEvents = Record<string, (...args: any) => any>

/**
 * Карта событий «событий нет».
 *
 * `keyof` у неё пуст, поэтому ни `on`, ни `relay` не примут ни одного имени, а
 * констрейнт карты событий (`TAnyEvents`) она удовлетворяет. Та же идиома
 * «пусто», что у `TCollectionEngine` без расширений: дефолт `TExtensions` —
 * `Record<never, IExtension<T>>`.
 *
 * Не `Record<string, never>`: у него индексная сигнатура, `keyof` — `string`, и
 * для проверки это «любое имя». Не `{}`: тип тот же, но пустой литерал требует
 * `eslint-disable` правила `@typescript-eslint/no-empty-object-type` в каждом
 * месте, где карта пуста.
 */
export type TNoEvents = Record<never, (...args: any) => any>

/**
 * Вид карты событий «только эмит».
 *
 * Класс с дженериком `TEvents extends TOwn` не может эмитить своё **собственное**
 * событие через `this.events: TEvented<TEvents>` без приведения — `TEvented`
 * инвариантен по карте событий (см. AGENTS.md, «События item-адаптера: `any` в
 * констрейнте, точный набор в инстанцировании»). Наследник мог сузить
 * обработчик, поэтому подписка (`on`) на дженерик-карту действительно
 * несостоятельна. Но эмит звучит: при `TEvents extends TOwn` обработчик,
 * рассчитанный на `TOwn`, обязан принять и `TOwn`-аргументы — контравариантность
 * `on` наследника это гарантирует.
 *
 * `TEventSink<TOwn>` выражает эту гарантию типом: он несёт только `emit` с той
 * же сигнатурой, что у `TEvented`, поэтому `TEvented<TEvents>` присваивается в
 * `TEventSink<TOwn>` структурно, без приведения. Подписку так не открывают —
 * вид создан только для эмита своих событий.
 */
export type TEventSink<TOwn extends Record<string, (...args: any) => any>> = {
	emit<K extends keyof TOwn>(event: K, ...args: Parameters<TOwn[K]>): void
}

/**
 * Правило проброса одного события из источника в цель — элемент списка
 * `TEvented.relay`.
 *
 * Строка пробрасывает событие под тем же именем, поэтому обязана быть в обеих
 * картах. Объект называет событие источника в `from` и имя в цели в `as`; без
 * `as` имя в цели то же, что `from`, и тогда `from` тоже обязан быть в цели.
 * Карта с индексной сигнатурой принимает любое имя.
 *
 * Имена сверяются здесь, а не в `this`-параметре `relay`, чтобы ошибка вставала
 * на строку правила. Совместимость обработчиков сверяет `relay` по
 * {@link TRelayedEvents}.
 *
 * Объектная форма — объединение по событиям источника: у правила с
 * `from: 'item:added'` хук `then` имеет тип обработчика именно `item:added`.
 *
 * @template TSource - события источника
 * @template TTarget - события цели (эмиттера, у которого вызван `relay`)
 */
export type TRelayRule<
	TSource extends Record<string, (...args: any) => any>,
	TTarget extends Record<string, (...args: any) => any>,
> =
	| (keyof TSource & keyof TTarget & string)
	| {
			[TFrom in keyof TSource & string]:
				| {
						/** Имя события в источнике. */
						from: TFrom
						/**
						 * Имя события в цели — переименование при пробросе.
						 *
						 * @example
						 * // Пробросить item:added как tab:added
						 * { from: 'item:added', as: 'tab:added' }
						 */
						as: keyof TTarget & string
						/**
						 * Хук, вызываемый **до** проброса события в цель. Тип — обработчик
						 * события `from`: аргументы те же.
						 * Удобен для подписки на события нового элемента сразу в момент его
						 * добавления — до того, как внешний код узнает о событии.
						 *
						 * @example
						 * {
						 *   from: 'item:added',
						 *   then: ({ item }) => {
						 *     item.events.on('change:disabled', (value) => {
						 *       this.events.emit('item:disabled', item, value)
						 *     })
						 *   }
						 * }
						 */
						then?: TSource[TFrom]
				  }
				| {
						/** Имя события в источнике и в цели: без `as` оно объявлено в обеих картах. */
						from: TFrom & keyof TTarget
						as?: undefined
						/** Хук, вызываемый **до** проброса события в цель, — обработчик события `from`. */
						then?: TSource[TFrom]
				  }
	  }[keyof TSource & string]

/** Имя события в источнике, которое пробрасывает правило. */
type TRelayFrom<TRule> = TRule extends { from: infer TFrom } ? TFrom : TRule

/** Имя, под которым правило пробрасывает событие в цель: `as ?? from`. */
type TRelayTo<TRule> = TRule extends { as: infer TAs extends string } ? TAs : TRelayFrom<TRule>

/**
 * Карта проброшенных событий: имя в цели → обработчик события `from` источника.
 *
 * Выводится из правил `TEvented.relay`, и `relay` требует от цели
 * `TEventSink` этой карты: проброс — это эмит в цель с аргументами события
 * источника.
 *
 * @template TSource - события источника
 * @template TRules - правила проброса, как их записали в вызове
 */
export type TRelayedEvents<
	TSource extends Record<string, (...args: any) => any>,
	TRules extends readonly unknown[],
> = {
	[TRule in TRules[number] as TRelayTo<TRule> & string]: TSource[TRelayFrom<TRule> &
		keyof TSource]
}
