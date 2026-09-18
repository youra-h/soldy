/**
 * Пропсы для `mount`, которые можно менять после монтирования: присваивание
 * полю — это смена пропа родителем.
 *
 * Руны работают только в `.svelte` и `.svelte.ts`, поэтому помощник живёт в
 * своём файле, а не в спеке.
 */
export function reactiveProps<TProps extends object>(initial: TProps): TProps {
	const props = $state(initial)

	return props
}
