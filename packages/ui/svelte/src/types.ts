/**
 * Общие типы Svelte-адаптера @soldy-ui/svelte.
 */

import type { Snippet } from 'svelte'
import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	DEFAULT_SLOT,
	TContractOf,
} from '@soldy-ui/setup'

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты как snippet-пропы — родной механизм Svelte 5.
 *
 * Отдельно от общего `TSlotProps`: там слот со scope это `узел | функция`,
 * а здесь и то и другое выражается одним `Snippet` — разница только в
 * объявленных параметрах. Сниппет без параметров присваивается `Snippet<[S]>`,
 * поэтому `<Button>текст</Button>` продолжает работать без изменений.
 */
export type TSnippetSlots<TSlots extends object> = {
	[K in keyof TSlots as K extends typeof DEFAULT_SLOT ? 'children' : K]?: TSlots[K] extends object
		? keyof TSlots[K] extends never
			? Snippet
			: Snippet<[TSlots[K]]>
		: Snippet
}

/** Слоты компонента из дескриптора. */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TSnippetSlots<DescriptorSlots<TDescriptorFn>>

/** Props headless-слоя: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * HTML-атрибуты DOM-компонента без пропсов, событий и слотов дескриптора —
 * как `TDomAttributes` у React.
 *
 * Вход дескриптора важнее одноимённого атрибута: пересечение сузило бы его до
 * типа атрибута. Слот `title` окна свёлся бы к строке атрибута `title`, и
 * сниппет в него было бы не передать. В рантайме этих имён в атрибутах и нет:
 * `forward` связки съедает пропсы, события и слоты дескриптора.
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
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = Omit<
	TAttributes,
	| 'children'
	| keyof DescriptorAllProps<TDescriptorFn>
	| TContractOf<TDescriptorFn>['protectedName']
	| keyof SlotProps<TDescriptorFn>
	| keyof TEvents
>

/**
 * Атрибуты `<input>` полей (Input, CheckBox, Switch): всё, кроме того, что
 * поле ведёт само, — как `TFieldAttributes` у React. Текст, отметку и
 * «выбрано частично» разметка берёт из состояния ядра, и атрибут потребителя
 * рядом с ними был бы вторым путём к тому же состоянию, а умолчания
 * (`defaultValue`, `defaultChecked` — в обоих регистрах, как их объявляет
 * Svelte) переписали бы то, что поле показывает из ядра. `readonly` — вход
 * дескриптора: имя у пропа и атрибута одно, и `TDomAttributes` вычитает его и
 * так, но поле без такого входа атрибута всё равно не получит.
 */
export type TFieldAttributes = Omit<
	HTMLInputAttributes,
	| 'checked'
	| 'indeterminate'
	| 'defaultChecked'
	| 'defaultchecked'
	| 'defaultValue'
	| 'defaultvalue'
	| 'readonly'
>

/**
 * Корень компонента — связываемый проп `ref` (`<Button bind:ref={button}>`):
 * `bind:this` у компонента Svelte даёт его экземпляр, а не узел. `ref` — не
 * атрибут: компонент берёт его из `$props()` сам, и ни на корень, ни на
 * `<input>` поля он не уходит. Узел — корень, у поля тоже, и `Element`, а не
 * `HTMLElement`: `tag` свободен, корнем бывает `<svg>`. Снят узел — `null`; до
 * монтирования и на сервере адаптер `ref` не пишет, и в нём то, с чем его
 * связал потребитель, — `null` или пусто.
 */
export type TRootRefProps = {
	ref?: Element | null
}

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с пропсами,
 * событиями и слотами дескриптора (см. `TDomAttributes`) + корень `ref`
 * (`TRootRefProps`).
 *
 * Атрибуты по умолчанию — `HTMLAttributes` корня; поля берут
 * `TFieldAttributes`: всё, кроме класса и стиля, у них уходит на `<input>`.
 * Button берёт атрибуты кнопки (`HTMLButtonAttributes`): его корень по
 * умолчанию — `<button>`, и `type`, `form`, `name`, `value` доходят до неё —
 * так деталь разметки библиотеки ставит себе `type="button"`.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	TDomAttributes<TDescriptorFn, TEvents, TAttributes> &
	TRootRefProps
