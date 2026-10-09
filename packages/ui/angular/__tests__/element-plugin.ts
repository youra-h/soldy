/**
 * Плагин узла в тестах — только через выход `element:create`.
 *
 * Выход `elementCreate` — геттер сгенерированного `T<Имя>Surface`, от которого
 * наследуется компонент: он даёт выходу тип, а первое чтение заводит эмиттер.
 * Поэтому выход читается как поле, без рефлексии и приведений.
 *
 * Подписка ставится до первой проверки изменений: набор объявляет себя на
 * микрозадаче после `ngOnInit` (`TOwnBundle._announce`), а `ngOnInit` зовёт
 * первый `detectChanges()`. Эмиттер заводит само чтение здесь, ещё до
 * `ngOnInit`, а приёмник событий ядра, поставленный там, находит его по имени.
 */

import type { ComponentFixture } from '@angular/core/testing'
import { TElementPlugin } from '@soldy-ui/plugins'
import type { TComponentViewComponent } from '@soldy-ui/angular'

/** Компонент с `TElementPlugin` в наборе: выход `elementCreate` у всех визуальных один. */
type TWithElementCreate = Pick<TComponentViewComponent, 'elementCreate'>

export function elementPlugin(fixture: ComponentFixture<TWithElementCreate>): () => TElementPlugin {
	let plugin: TElementPlugin | undefined

	fixture.componentInstance.elementCreate.subscribe((value) => {
		if (value instanceof TElementPlugin) plugin = value
	})

	return () => {
		if (!plugin) throw new Error('element:create не пришёл')

		return plugin
	}
}

/** Набор объявляется на микрозадаче — см. `TOwnBundle._announce`. */
export const announced = (): Promise<void> => Promise.resolve()
