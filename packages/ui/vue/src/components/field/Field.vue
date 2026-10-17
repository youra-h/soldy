<script lang="ts">
import { Icon } from '../icon'
import SetupField from './setup.component'

export default { ...SetupField, components: { Icon } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Field — поле формы: подпись, контрол, подсказка и ошибка, связанные с
			контролом сами. Корень рисуется по `tag`, по умолчанию `div`. На
			корне — модификаторы `so-field--position-*` (`top`, `start`, `end`) и
			`so-field--size-*`. Своих состояний у Field нет: выключенность,
			только чтение и обязательность тема читает с корня контрола, ошибку
			контрол рисует по своему `data-invalid` — его пишет связка поля с
			контролом.

			Порядок частей один на все стороны — подпись, контрол, подсказка,
			ошибка: сторону рисует тема, по нему же сетка ставит подпись сбоку.
			Часть стоит, пока задан её текст: ссылки контрола на части ставит
			ядро, а слотов оно не видит. Ошибка рисуется при `invalid` и встаёт
			на место подсказки: при ошибке подсказки нет. Что рисовать, решает
			ядро (`helperRendered`, `errorRendered`).

			Комментарий — внутри корня, а не над ним: в разработке Vue оставляет
			комментарии, и корнем стал бы фрагмент.
		-->
		<!--
			Подпись — имя поля. Текст — проп `label`, своя разметка — слот
			`label-content`. Только сама подпись: её текст — доступное имя
			контрола, и описание сюда не кладут. Связку с контролом — `id` и
			`for` — несёт набор `labelAria`: `for` на поле у контролов с
			`<input>` (клик доходит до поля), а у групп — DateInput, DatePicker,
			RadioGroup — `for` нет, их называет ссылка `aria-labelledby` на `id`.
		-->
		<label v-if="label" class="so-field__label" v-bind="labelAria"
			><slot name="label-content">{{ label }}</slot></label
		>
		<!-- Контрол — слот `default`: Input, Select, CheckBox, Label с контролом… -->
		<div class="so-field__control"><slot /></div>
		<!--
			Подсказка — проп `helper`, своя разметка — слот `helper-content`: в
			ней бывают ссылки и списки, отсюда `div`. Её `id` (набор
			`helperAria`) — в `aria-describedby` контрола.
		-->
		<div v-if="helperRendered" class="so-field__helper" v-bind="helperAria">
			<slot name="helper-content">{{ helper }}</slot>
		</div>
		<!--
			Ошибка — проп `error`, своя разметка — слот `error-content`; её `id`
			(набор `errorAria`) — в `aria-describedby` контрола вместо подсказки.
			Значок — роль `error`, декор: смысл несёт текст, а значок отличает
			ошибку от подсказки там, где цвета нет (режим принудительных цветов).
			Размера у значка нет: его ставит тема — в кегль ошибки. Текст — в
			своей обёртке: ряд из значка и текста — флекс, и текст со ссылкой без
			обёртки разошёлся бы на отдельные коробки.
		-->
		<div v-if="errorRendered" class="so-field__error" v-bind="errorAria">
			<Icon embedded="field.error-icon" class="so-field__error-icon" :tag="errorIconTag" />
			<div class="so-field__error-text">
				<slot name="error-content">{{ error }}</slot>
			</div>
		</div>
	</component>
</template>
