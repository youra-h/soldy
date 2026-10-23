/**
 * Состояние двух контекстов — одним видом: геттеры поверх рун обоих, а не
 * спред, который прочёл бы их один раз при сборке. AGENTS.md (Svelte),
 * «Коллекция: два контекста — одна связка».
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

	// Граница рантайма и типа, как `toInstanceState`: геттер стоит на каждом
	// ключе обоих состояний, но связь по именам TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
