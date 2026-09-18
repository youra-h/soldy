/**
 * Начальные значения пропсов, которыми владеет плагин.
 *
 * Ядро свои пропсы получает через конструктор: `new ctor(props)`. Плагины —
 * нет. Набор собирается после инстанса и знает только опции состава, а пропсы
 * потребителя до плагина не доходят вовсе. Дальше остаётся лишь `bindInput`
 * адаптера, но он подписан на *изменение*: во Vue это `watch` без `immediate`,
 * и начальное значение он пропускает.
 *
 * Итог без этого шага: `<Button aria_label="Закрыть">` при монтировании имя не
 * получает — оно появляется, только если значение потом поменять.
 *
 * Шаг сборки, а не расширение контекста: пропсы плагинов — часть состава, и
 * знать о нём должен тот, кто состав собрал. Расширением это было, пока состав
 * знал только дескриптор, и подключалось по условию «есть ли у плагинов
 * записываемые пропсы» — условие, которое приходилось вычислять отдельно.
 *
 * Пропсы берутся из состава, где они перечислены явно, а не вычисляются из
 * «этим свойством владеет не инстанс». Первое — контракт, второе — догадка.
 */

import type { IPluginBundle } from '@soldy/plugins'
import { underscorePropNaming } from '../naming'
import type { ICompositionEntry } from './types'

export function applyInitialPluginProps(
	composition: readonly ICompositionEntry[],
	bundle: IPluginBundle | null,
	props: object | undefined,
): void {
	if (!bundle || !props) return

	for (const entry of composition) {
		if (!entry.props?.length) continue

		const plugin = bundle.get(entry.ctor)

		if (!plugin) continue

		for (const prop of entry.props) {
			// protected-пропсы плагин вычисляет сам, снаружи их не пишут
			if (prop.protected) continue

			// Имя с неймспейсом — то же, что ищет bindInput. Оба варианта нужны
			// потому же, почему и там: адаптеры зовут проп `aria_label`, а тесты
			// и headless-код — просто `label`.
			const value: unknown =
				Reflect.get(props, underscorePropNaming(prop.name)) ??
				Reflect.get(props, prop.name.name)

			if (value === undefined) continue

			if (prop.set) {
				prop.set(plugin, value)
				continue
			}

			Reflect.set(plugin, prop.name.name, value)
		}
	}
}
