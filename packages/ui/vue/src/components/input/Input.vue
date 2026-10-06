<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import SetupInput from './setup.component'

export default { ...SetupInput, components: { Button, Icon } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...containerAttrs }"
	>
		<!--
			Корень рисуется по `tag`, по умолчанию `div`: `tag` — всегда тег
			корня, и по нему же ядро решает, есть ли у корня нативный
			`disabled`.
		-->
		<div v-if="$slots.leading" class="s-input__leading">
			<slot name="leading" :ctrl="ctrl"> </slot>
		</div>
		<input
			type="text"
			:id="id"
			:value="value"
			:name="name"
			:disabled="disabled"
			:readonly="readonly"
			:required="required"
			:placeholder="placeholder"
			v-bind="{ ...aria, ...controlAttrs }"
		/>
		<!--
			Обёртка у конца поля — по кнопке очистки, по своей кнопке в слоте
			`clear` или по слоту `trailing`. Кнопка очистки стоит в ней первой,
			перед содержимым `trailing`.
		-->
		<div v-if="clearable || $slots.clear || $slots.trailing" class="s-input__trailing">
			<!--
				Кнопка очистки — по `clearable`, выключена вместе с полем.
				`readonly` её не гасит: select-only Select и есть `readonly`, а
				очистка там работает. Имя ядро собирает с именем поля
				(`clearAria`), очищает команда поля `clear`. Клик не всплывает:
				предок, который слушает клик по полю (select-only Select
				открывает по нему панель), его не получит.

				Своя кнопка — слот `clear`: заменяет встроенную целиком и
				рисуется, когда задана. Команду очистки получает в scope.

				У кнопки нет `view`: значения вида объявляет тема, и разметка
				библиотеки их не знает. Кнопку тема красит по контексту
				(`.s-input__clear`).
			-->
			<slot name="clear" :clear="ctrl.clear">
				<Button
					embedded="input.clear"
					v-if="clearable"
					class="s-input__clear"
					:size="size"
					:disabled="disabled"
					@click.stop="ctrl.clear()"
					v-bind="clearAria"
				>
					<Icon embedded="input.clear-icon" :tag="clearIconTag" :size="size" />
				</Button>
			</slot>
			<slot name="trailing" :ctrl="ctrl"> </slot>
		</div>
	</component>
</template>
