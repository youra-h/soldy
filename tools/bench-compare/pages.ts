/**
 * Components compared with the neighbors — the ones the plan names and most
 * libraries have. A neighbor without one of them leaves its cell empty: the
 * page is not measured and does not enter `all` of that pair
 * (benchmarks/compare/README.md, «Матрица»).
 */
export const COMPARED = [
	'button',
	'input',
	'check-box',
	'switch',
	'select',
	'tabs',
	'dialog',
	'tooltip',
	'menu',
	'date-picker',
]

/** A component id of a page file: `libs/react/mui/date-picker.tsx` → `date-picker`. */
export function idOf(file: string): string {
	return file.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
}
