/**
 * Состояние двух контекстов — одним видом: прокси, которое читает свойство у
 * состояния на каждое чтение, а не спред, который прочёл бы их один раз при
 * сборке. AGENTS.md (Svelte), «Коллекция: два контекста — одна связка».
 */

/** Одноимённое свойство берётся из верхнего состояния. */
export type TJoinedState<TBelow extends object, TAbove extends object> = Omit<
	TBelow,
	keyof TAbove
> &
	TAbove

/** Два состояния за прокси вида. */
type TStates = {
	readonly below: object
	readonly above: object
}

/** Состояние, у которого свойство берётся: верхнее, если оно у него есть. */
function sourceOf({ below, above }: TStates, key: string | symbol): object {
	return Reflect.has(above, key) ? above : below
}

/**
 * Обработчик один на все виды: геттер на каждое имя обоих состояний —
 * замыкание, его область и пара аксессоров — у строки таблицы стоил килобайты
 * (benchmarks/table/svelte.md).
 */
const JOINED: ProxyHandler<TStates> = {
	get: (states, key) => Reflect.get(sourceOf(states, key), key),
	has: ({ below, above }, key) => Reflect.has(above, key) || Reflect.has(below, key),
	ownKeys: ({ below, above }) => [
		...new Set([...Reflect.ownKeys(below), ...Reflect.ownKeys(above)]),
	],
	getOwnPropertyDescriptor: (states, key) =>
		Reflect.getOwnPropertyDescriptor(sourceOf(states, key), key),
}

export function joinState<TBelow extends object, TAbove extends object>(
	below: TBelow,
	above: TAbove,
): TJoinedState<TBelow, TAbove> {
	const joined: Readonly<Record<string, unknown>> = new Proxy<TStates>({ below, above }, JOINED)

	// Граница рантайма и типа, как `toInstanceState`: прокси отдаёт каждое
	// свойство обоих состояний, но связь по именам TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
