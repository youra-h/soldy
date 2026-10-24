/**
 * Состояние адаптера в типах: свойства инстанса и выходы плагинов так, как их видит разметка.
 */

import type { IComponentContract } from '../../define'

/**
 * Значение свойства инстанса так, как его видит разметка.
 *
 * Составной объект со своим `valueOf()` отдаёт снимок (`TClasses` → `string[]`,
 * `TAria` → набор атрибутов) — ровно так значение читает `TProperty.value`.
 * У объекта без своего `valueOf` (унаследованный вернул бы сам объект) снимка
 * нет, остаётся тип свойства. Примитивы не трогаются, чтобы не расширять
 * литеральные типы вроде `'ltr' | 'rtl'`.
 */
export type TSnapshotOf<T> = T extends object
	? T extends { valueOf(): infer TValue }
		? [T] extends [TValue]
			? T
			: TValue
		: T
	: T

/**
 * Состояние адаптера, как его читает разметка: свойства инстанса после
 * `valueOf()`.
 *
 * Все ключи необязательны: состояние собирается по дескриптору и содержит только
 * свойства с триггерами.
 */
export type TInstanceState<TInstance> = {
	readonly [K in keyof TInstance]?: TSnapshotOf<TInstance[K]>
}

/**
 * Состояние адаптера целиком: свойства инстанса, входы и выходы плагинов
 * дескриптора.
 *
 * Выход — защищённый проп плагина (`dismiss_ownerAttribute`, `layout_styles`),
 * то есть геттер плагина, как свойство инстанса — геттер инстанса. Поэтому и
 * вид у него тот же: снимок `valueOf()`, только чтение, необязательный ключ.
 * Вход плагина с триггером обмен держит в состоянии так же, как свойство
 * инстанса (`id` у `TIdPlugin`, `aria_label` у `TAriaPlugin`), — и тип
 * состояния его называет. И инстанс, и плагины — из контракта дескриптора; до
 * адаптера он доходит типом контекста (`IAdapterContext<C>`).
 */
export type TAdapterState<C extends IComponentContract> = TInstanceState<C['instance']> &
	TInstanceState<C['plugins']['props']> &
	TInstanceState<C['plugins']['outputs']>
