/**
 * Контракты связки поля формы с контролом: что поле опускает по лифту, каким
 * связка видит контрол, и опции расширений.
 */

import type { IField, TAria, TInputControlEvents } from '@soldy-ui/core'
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
 * и набор элемента, который она называет: у labelable-контрола без `id` поля
 * `id` от поля ложится туда.
 */
export interface IFieldControl {
	invalid: boolean
	readonly labelable: boolean
	readonly aria: TAria
}

/**
 * Контрол с `id` поля (`TInputControl`): `for` подписи ведёт на этот `id`. Не
 * задал его потребитель — labelable-контролу его задаёт поле: свой `id`
 * каждый контрол уже ведёт до своего `<input>`, и у Select — до поля внутри.
 */
export interface IFieldInputControl extends IFieldControl {
	id: string | undefined
	readonly events: IListenable<Pick<TInputControlEvents, 'change:id'>>
}

/** Любой контрол поля: с `id` поля или без него (группа радио, ползунок). */
export type TFieldControl = IFieldControl | IFieldInputControl

export interface IFieldExtensionOptions {
	elevator: TElevatorFactory
}

export interface IFieldControlExtensionOptions {
	elevator: TElevatorFactory
}
