/**
 * «То же самое» для числа, строки и их списков: списки — поэлементно.
 *
 * Правило единицы `value` у контролов со значением и шага, значения и имён
 * ручек Slider. Список, собранный заново с тем же составом, — то же самое
 * значение: иначе значение, вернувшееся тем же списком (эхо `update:value` у
 * `v-model`, литерал в разметке), слало бы второй `change:value`.
 */
export function sameValue(a: unknown, b: unknown): boolean {
	if (a === b) return true

	return (
		Array.isArray(a) &&
		Array.isArray(b) &&
		a.length === b.length &&
		a.every((item, index) => item === b[index])
	)
}
