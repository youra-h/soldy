<script lang="ts">
import { Button } from '../../button'
import SetupMenuRadioItem from './setup.component'

/**
 * Переключатель меню — строка пункта с отметкой-точкой в начале.
 *
 * Вокруг слотов значка и подсказки нет пробелов: пустую обёртку тема прячет
 * по `:empty`, и пробельный текст сделал бы её непустой.
 */
export default { ...SetupMenuRadioItem, components: { Button } }
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
			Строка — `Button` на `div`, как у флажка: на ней ARIA переключателя
			(роль `menuitemradio`, `aria-checked` и `tabindex="-1"` от меню) и
			DOM-фокус, когда переключатель подсвечен.

			Нажатие — клик строки, из Enter и пробела его делает сама строка.
			Решает меню (`adapters.menu.check()`): выключенному отказывает, а
			доступный отмечает — с остальных переключателей группы отметка
			снимается — и остаётся открытым. Отмеченный нажатием не снимается.
		-->
		<Button
			embedded="menu.row"
			tag="div"
			:size="size"
			:disabled="disabled"
			@click="context?.adapters.menu.check()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<!--
					Отметка — у неотмеченного переключателя тоже: обёртка держит
					колонку, а её наличие в списке тема читает как «у меню есть
					колонка отметок». Точка внутри — только у отмеченного; её
					рисует тема, без иконки. Обёртка скрыта от скринридера:
					состояние объявляет `aria-checked`.
				-->
				<span class="so-menu-item__indicator" aria-hidden="true">
					<slot name="indicator-icon" :selected="selected">
						<span v-if="selected" class="so-menu-item__dot" />
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
