<script lang="ts">
import { Icon } from '../../icon'
import { Button } from '../../button'
import SetupMenuCheckboxItem from './setup.component'

/**
 * Флажок меню — строка пункта с отметкой в начале.
 *
 * Вокруг слотов значка и подсказки нет пробелов: пустую обёртку тема прячет
 * по `:empty`, и пробельный текст сделал бы её непустой.
 */
export default { ...SetupMenuCheckboxItem, components: { Icon, Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<!--
			Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
			`data-selected`) и модификаторы размера меню и своего варианта, а
			строка красится от него: носитель `dataset` один.
		-->

		<!--
			Строка — `Button` над экземпляром флажка (`row`, `TItemRow` на
			`div`), как у пункта: на ней ARIA флажка (роль `menuitemcheckbox`,
			`aria-checked` и `tabindex="-1"` от меню) и DOM-фокус, когда флажок
			подсвечен. Размер и `disabled` ей пишет флажок.

			Нажатие — клик строки, из Enter и пробела его делает сама строка.
			Решает меню (`adapters.menu.toggle()`): выключенному отказывает, а
			доступному переключает отметку — выбор коллекции — и остаётся
			открытым.
		-->
		<Button
			embedded="menu.row"
			:ctrl="row"
			@click="context?.adapters.menu.toggle()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<!--
					Отметка — у неотмеченного флажка тоже: обёртка держит колонку,
					а её наличие в списке тема читает как «у меню есть колонка
					отметок». Рисунок внутри — только у отмеченного. Обёртка скрыта
					от скринридера: состояние объявляет `aria-checked`.
				-->
				<span class="so-menu-item__indicator" aria-hidden="true">
					<slot name="indicator-icon" :selected="selected">
						<Icon
							embedded="menu.indicator"
							v-if="selected"
							:tag="indicatorIconTag"
							:size="size"
						/>
					</slot>
				</span>
				<span class="so-menu-item__icon"><slot name="leading" /></span>
			</template>

			<slot :text="text" :selected="selected">{{ text }}</slot>

			<template #trailing>
				<span class="so-menu-item__shortcut"><slot name="trailing" /></span>
			</template>
		</Button>
	</component>
</template>
