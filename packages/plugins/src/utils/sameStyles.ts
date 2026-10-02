/**
 * Одни ли и те же стили: те же ключи с теми же значениями. Порядок ключей не
 * важен — это набор свойств, а не список.
 *
 * Плагин раскладки пересчитывает стили на каждый повод, а `change:styles`
 * шлёт, только когда они сменились по содержимому: повод пересчёта не всегда
 * их меняет — так, принятие набора перечитывает всё, что подписка могла не
 * застать.
 */
export function sameStyles(
	a: Readonly<Record<string, string | number>>,
	b: Readonly<Record<string, string | number>>,
): boolean {
	const keys = Object.keys(a)

	return keys.length === Object.keys(b).length && keys.every((key) => b[key] === a[key])
}
