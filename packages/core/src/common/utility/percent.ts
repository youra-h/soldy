/**
 * Доля процентом для CSS — с `%` и без хвоста плавающей точки: 0.3 даёт
 * `30%`, а не `30.000000000000004%`.
 *
 * Одна на ядро: позиции ручек и края заливки Slider, доля ProgressLinear.
 * Разойдись копии, одна полоса округляла бы иначе другой.
 */
export function percent(fraction: number): string {
	return `${Math.round(fraction * 1e6) / 1e4}%`
}

/**
 * Доля числом для CSS — без единиц и без хвоста плавающей точки, той же
 * точности, что `percent`: треть даёт `0.333333`, 0.1 + 0.2 — `0.3`.
 *
 * Для тех, кому процент не годится: длину дуги ProgressSpinner SVG меряет в
 * долях окружности, и тема кладёт долю в штрих как есть.
 */
export function decimal(fraction: number): string {
	return String(Math.round(fraction * 1e6) / 1e6)
}
