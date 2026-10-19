/**
 * setupField — setup-слой Field.
 *
 * Собирает поле (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) с его проводкой
 * (`TFieldExtension`): связку контролу внутри она опускает лифтом своему
 * хосту. Контрол в свете поля — Input, CheckBox, Switch, RadioGroup —
 * собирается следом, находит её вверх по документу и подхватывает своим
 * расширением (`TFieldControlExtension`). Связка у элемента новая на каждое
 * подключение, и связка поля опускается заново.
 *
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок, а части ведёт шаблон.
 */

import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupField(
	host: HTMLElement,
	ctrl: IField | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IField> {
	const adapter = createWebcAdapterContext(host, FieldDescriptor(), { ctrl, props }).use(
		TFieldExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
