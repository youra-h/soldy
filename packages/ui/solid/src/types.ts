/**
 * Общие типы Solid-адаптера @soldy-ui/solid.
 */

import type { JSX } from 'solid-js'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	TContractOf,
	TSlotProps,
} from '@soldy-ui/setup'
import type { TConsumerRef } from './adapter'

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> = TSlotProps<
	DescriptorSlots<TDescriptorFn>,
	JSX.Element
>

/** Props headless-слоя: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * HTML-атрибуты DOM-компонента без пропсов, событий и слотов дескриптора —
 * как `TDomAttributes` у React и Svelte.
 *
 * Вход дескриптора важнее одноимённого атрибута: пересечение сузило бы его до
 * типа атрибута. Слот `title` окна свёлся бы к строке атрибута `title`, а
 * колбэк события `input` у полей — к обработчику `onInput` DOM. В рантайме
 * этих имён в атрибутах и нет: `forward` связки съедает пропсы, события и
 * слоты дескриптора.
 *
 * `children` вычитается всегда, а не только у компонента со слотом `default`:
 * содержимое — это только слот `default`. `DOMAttributes.children` вернул бы
 * его компоненту, чья разметка содержимого не рисует, и содержимое молча
 * пропало бы. Компоненту со слотом `children` даёт `SlotProps`.
 *
 * Защищённые пропсы — тоже: `forward` съедает и их, хотя входа у разметки нет
 * (`DescriptorAllProps` их вычитает). Без вычета атрибут с тем же именем
 * вернул бы вход в тип.
 *
 * События — те, что компонент принимает (`TEvents`): у коллекции это ещё и
 * события фасада.
 *
 * Это ровно то, что компонент не съел: его `forwardProps` без входов
 * дескриптора. Атрибуты — корня (`HTMLAttributes`), у поля — его `<input>`
 * (`TFieldAttributes`): поле раздаёт их двум элементам, класс и стиль — корню,
 * остальное — `<input>` (`toControlAttrs`).
 *
 * Кроме `ref`: он всегда ведёт к корню компонента (`TConsumerRef`), у поля
 * тоже, — `ref` из атрибутов узла (`<input>` у поля) здесь заменён им. Узел —
 * `Element`: `tag` свободен, корнем бывает `<svg>`.
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = JSX.HTMLAttributes<HTMLElement>,
> = Omit<
	TAttributes,
	| 'children'
	| 'ref'
	| keyof DescriptorAllProps<TDescriptorFn>
	| TContractOf<TDescriptorFn>['protectedName']
	| keyof SlotProps<TDescriptorFn>
	| keyof TEvents
> & {
	/** Корень компонента — узел, на который ложатся класс и атрибуты потребителя. */
	ref?: TConsumerRef
}

/**
 * Атрибуты `<input>` полей (Input, CheckBox, Switch): всё, кроме того, что
 * поле ведёт само, — как `TFieldAttributes` у React и Svelte. Отметку и
 * «выбрано частично» разметка берёт из состояния ядра, и атрибут потребителя
 * рядом с ними был бы вторым путём к тому же состоянию. `readonly` — вход
 * дескриптора: `TDomAttributes` вычитает его и так, а `readOnly` — то же
 * свойство узла под именем DOM. Текст поля — вход `value`, его вычитает
 * `TDomAttributes`. `ref` `<input>` здесь нет: `ref` потребителя у поля ведёт
 * к корню (`TDomAttributes`), а `ref` самого `<input>` — свой у поля
 * (`fieldText`).
 */
export type TFieldAttributes = Omit<
	JSX.InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'prop:indeterminate' | 'readonly' | 'readOnly' | 'ref'
>

/**
 * Атрибуты `<textarea>` Textarea — как `TFieldAttributes` у `<input>`: всё,
 * кроме того, что поле ведёт само. `readonly` и `maxlength` — входы
 * дескриптора: `TDomAttributes` вычитает их и так, а `readOnly` и `maxLength`
 * — те же свойства узла под именами DOM. Текст поля — вход `value`, а
 * содержимое `<textarea>` (`textContent`, `innerHTML`) — её умолчание:
 * атрибутом потребителя оно было бы вторым путём к тексту. `ref` `<textarea>`
 * здесь нет: `ref` потребителя ведёт к корню (`TDomAttributes`), а `ref`
 * самой `<textarea>` — свой у поля (`textareaText`).
 */
export type TTextareaAttributes = Omit<
	JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
	'readonly' | 'readOnly' | 'maxlength' | 'maxLength' | 'textContent' | 'innerHTML' | 'ref'
>

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с пропсами,
 * событиями и слотами дескриптора (см. `TDomAttributes`).
 *
 * Атрибуты по умолчанию — `HTMLAttributes` корня; поля берут
 * `TFieldAttributes` (Textarea — `TTextareaAttributes`): всё, кроме класса и
 * стиля, у них уходит на `<input>` или `<textarea>`.
 * Button берёт атрибуты кнопки (`ButtonHTMLAttributes`): его корень по
 * умолчанию — `<button>`, и `type`, `form`, `name`, `value` доходят до неё —
 * так деталь разметки библиотеки ставит себе `type="button"`.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = JSX.HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	TDomAttributes<TDescriptorFn, TEvents, TAttributes>

/**
 * «Выбрано частично» флажка — свойство узла `<input>` (`indeterminate`), и
 * атрибута у него нет. Solid пишет его свойством — имя в его списке свойств
 * узла, — но в атрибутах `<input>` его типов JSX нет. Разметка CheckBox пишет
 * его явно свойством — `prop:indeterminate`, — а тип такой записи Solid берёт
 * из `JSX.ExplicitProperties`: это и есть его точка расширения для свойств
 * узла, которых нет среди атрибутов. На сервере запись `prop:` в разметку не
 * уходит: атрибута `indeterminate` у HTML нет, и «выбрано частично» поле
 * покажет после гидратации.
 */
declare module 'solid-js' {
	namespace JSX {
		interface ExplicitProperties {
			indeterminate: boolean
		}
	}
}
