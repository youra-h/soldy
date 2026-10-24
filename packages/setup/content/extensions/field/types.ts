/**
 * Контракты связки поля формы с контролом: что поле опускает по лифту, каким
 * связка видит контрол, и опции расширений.
 */

import type { IField, TAria, TControlEvents } from '@soldy-ui/core'
import type { IListenable, TFieldIdsPlugin } from '@soldy-ui/plugins'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Связка поля: само поле — его ошибка и событие её смены — и его плагин
 * связок: `id` поля, ссылки на видимые части и приём контрола.
 */
export interface IFieldLink {
	readonly field: IField
	readonly ids: TFieldIdsPlugin
}

/**
 * Контрол поля глазами связки: ошибка, которую ему пишет поле, признак
 * labelable — называет ли подпись его своим `for` или, как группу, ссылкой, —
 * с событием его смены и набор элемента, который она называет: у
 * labelable-контрола без `TIdPlugin` (ползунок) `id` от поля ложится туда.
 *
 * Labelable меняется по ходу жизни не у всякого контрола: у ползунка — с
 * числом ручек, а подпись — за ним.
 */
export interface IFieldControl {
	invalid: boolean
	readonly labelable: boolean
	readonly aria: TAria
	readonly events: IListenable<Pick<TControlEvents, 'change:labelable'>>
}

export interface IFieldExtensionOptions {
	elevator: TElevatorFactory
}

export interface IFieldControlExtensionOptions {
	elevator: TElevatorFactory
}
