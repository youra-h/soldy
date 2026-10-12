/**
 * Состояние двух контекстов одного компонента — одним видом.
 *
 * У коллекции контекстов два: свой и фасада (`useAdapter` и
 * `useCollectionAdapter`), и разметка читает свойства обоих одним объектом —
 * как React, который сливает их спредом `{ ...owner.state, ...facade.state }`
 * на каждом рендере. В Svelte спред не годится: компонент собирается один
 * раз, и спред прочёл бы состояние при сборке — смены до разметки не дошли
 * бы. Поэтому вид — геттеры поверх обоих состояний: чтение свойства — это
 * чтение руны его контекста, и разметка следит за ним, как за своим.
 *
 * Состав свойств известен к сборке: подписка на связку отдаёт каждое
 * свойство сразу (`useAdapter`), и ключи обоих состояний на месте. Ключи
 * верхнего (`above`) перекрывают одноимённые нижнего (`below`), как правый
 * спред, — хотя одноимённых у компонента и фасада быть не должно: имена
 * пропсов фасада префиксуются (`tab_closable`).
 */

/** Одноимённое свойство берётся из верхнего состояния. */
export type TJoinedState<TBelow extends object, TAbove extends object> = Omit<
	TBelow,
	keyof TAbove
> &
	TAbove

export function joinState<TBelow extends object, TAbove extends object>(
	below: TBelow,
	above: TAbove,
): TJoinedState<TBelow, TAbove> {
	const joined: Record<string, unknown> = {}

	for (const source of [below, above]) {
		for (const key of Object.keys(source)) {
			Object.defineProperty(joined, key, {
				enumerable: true,
				configurable: true,
				get: () => Reflect.get(source, key),
			})
		}
	}

	// Граница между рантаймом и типом, как `toInstanceState` у состояния одного
	// контекста: геттер стоит на каждом ключе обоих состояний, но связь по
	// именам TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
