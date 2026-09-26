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
