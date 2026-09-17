<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupTabsItem from './setup.component'

export default { ...SetupTabsItem, components: { Icon, Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="{ order: order }"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<!--
			Вся ARIA таба — на элементе, который и есть таб. Раньше
			`aria-selected` стоял на внешней обёртке без роли, а `role="tab"` —
			здесь: для скринридера таб не был выбран никогда.

			Набор один. В него пишут ядро (`role`), расширение коллекции
			(`aria-selected`) и проводка панели (`id`, `aria-controls`) — но
			шаблону об этом знать незачем. `controlAttrs` рядом — это сквозные
			атрибуты Vue, чужая сущность.

			`dataset` на обёртке — то же состояние для CSS: тема красит активный
			таб по `data-selected`. ARIA — для скринридера, `data-*` — для
			стилей; смешивать нельзя, иначе правка ARIA ломает вид.

			Имя `selected` при состоянии `active` — не описка: `data-*` описывает
			вид, а «выделенный элемент» тема красит одинаково у таба, секции и
			опции. Пишет его расширение активации, шаблон ничего не вычисляет.
		-->
		<Button
			:disabled="disabled"
			:size="size"
			:variant="variant"
			@click="context && (context.adapters.activation.active = true)"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<slot name="leading" />
			</template>

			<slot :text="text" :active="active">
				{{ text }}
			</slot>

			<template #trailing>
				<slot name="trailing" />
			</template>
		</Button>

		<!--
			Кнопка закрытия — сосед строки, а не её часть. Строка — это
			`<button role="tab">`: интерактивный потомок у кнопки HTML запрещает,
			потомки таба для скринридера презентационны, а имя таба считается из
			содержимого. Внутри строки крестик не был кнопкой, и его подпись
			приклеивалась к названию: «Настройки Close Настройки».

			Имя кнопки приходит из ядра вместе с текстом таба («Close Настройки»).
			Без него у кнопки нет имени вообще, а с одним лишь «Close» все кнопки
			набора неразличимы в списке элементов скринридера.

			`size` и `disabled` — явно: от строки кнопка их больше не наследует.
			От размера зависит кегль, от кегля — иконка; выключенный таб
			выключает и свою кнопку. Место рядом со строкой держит тема
			(`.s-tabs-item`).

			`view` нет ни у крестика, ни у строки: значения вида объявляет тема,
			и разметка библиотеки их не знает. Обе части тема красит по контексту.
		-->
		<Button
			:rendered="!!tab_closable"
			class="s-tabs-item__close"
			:disabled="disabled"
			:size="size"
			@click.stop="context?.adapters?.tabs?.close()"
			v-bind="closeAria"
		>
			<slot name="close-icon">
				<Icon :tag="closeIconTag" :size="size" />
			</slot>
		</Button>
	</component>
</template>
