/**
 * Плагин узла в тестах — только через выход `element:create`.
 *
 * Эмиттеры аутпутов ставит конструктор `TComponentBase` через `Reflect.set`:
 * имена приходят генерированным массивом, полей класса под них нет. Поэтому и
 * читаются они рефлексией — приведение здесь прятало бы отсутствие выхода,
 * а не чинило его.
 *
 * Подписка ставится до первой проверки изменений: набор объявляет себя на
 * микрозадаче после `ngOnInit` (`TOwnBundle._announce`), а `ngOnInit` зовёт
 * первый `detectChanges()`.
 */

import { EventEmitter } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import { TElementPlugin } from '@soldy-ui/plugins'

export function elementPlugin(fixture: ComponentFixture<object>): () => TElementPlugin {
	const output: unknown = Reflect.get(fixture.componentInstance, 'elementCreate')

	if (!(output instanceof EventEmitter)) throw new Error('Выход elementCreate не объявлен')

	let plugin: TElementPlugin | undefined

	output.subscribe((value: unknown) => {
		if (value instanceof TElementPlugin) plugin = value
	})

	return () => {
		if (!plugin) throw new Error('element:create не пришёл')

		return plugin
	}
}

/** Набор объявляется на микрозадаче — см. `TOwnBundle._announce`. */
export const announced = (): Promise<void> => Promise.resolve()
