export type TRec = Record<string, string | number>
export function makeRows(count: number, seed = 1): TRec[] {
	let s = seed
	const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
	const names = [
		'Анна',
		'Борис',
		'Вера',
		'Глеб',
		'Дина',
		'Егор',
		'Жанна',
		'Захар',
		'Ирина',
		'Кирилл',
	]
	return Array.from({ length: count }, (_, i) => {
		const r: TRec = {
			id: i,
			name: `${names[Math.floor(rnd() * names.length)]} ${Math.floor(rnd() * 100000)}`,
		}
		for (let c = 1; c < 20; c++) r[`c${c}`] = Math.floor(rnd() * 100000)
		return r
	})
}
// `?cols=5` — показать только первые колонки: цена строки против цены ячейки
const shownColumns = Number(new URLSearchParams(location.search).get('cols') ?? 20)
export const COLUMNS = [
	{ field: 'name', text: 'Имя' },
	...Array.from({ length: 19 }, (_, i) => ({ field: `c${i + 1}`, text: `Кол ${i + 1}` })),
].slice(0, shownColumns)
