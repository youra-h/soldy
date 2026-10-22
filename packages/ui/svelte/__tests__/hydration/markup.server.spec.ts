/**
 * Разметка сервера для гидратации — фикстуры прогона гидратации.
 *
 * Гидратации нужны обе сборки страницы сразу, а в одном прогоне компоненты
 * собраны под одно окружение. Поэтому разметку сервера пишет этот прогон:
 * рисует страницу `render` из `svelte/server`, как сервер приложения, — с
 * метками гидратации блоков и id монтирования в комментариях, — и сверяет её
 * с фикстурой в `markup/`. Прогон гидратации (`*.hydration.spec.ts`) кладёт
 * фикстуру в документ и гидратирует её той же страницей, собранной для
 * браузера. Разошлась разметка сервера с фикстурой — этот спек красный, и
 * фикстуры переписывает `vitest -u`: от сервера они не отстанут.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import ButtonStyle from './ButtonStyle.test.svelte'
import CalendarValue from './CalendarValue.test.svelte'
import DateInputValue from './DateInputValue.test.svelte'
import DatePickerValue from './DatePickerValue.test.svelte'
import FieldText from './FieldText.test.svelte'
import FrameContained from './FrameContained.test.svelte'
import PopoverContained from './PopoverContained.test.svelte'
import { useToday } from './today'

useToday()

/**
 * Фикстура — имя файла в `markup/` — и разметка сервера её страницы. Пропсы
 * страницы — только то, что у сервера и браузера расходится намеренно.
 */
const PAGES: ReadonlyArray<readonly [fixture: string, body: () => string]> = [
	['date-input-value', () => render(DateInputValue).body],
	['date-picker-value', () => render(DatePickerValue).body],
	['calendar-value', () => render(CalendarValue).body],
	['frame-contained', () => render(FrameContained, { props: { contained: true } }).body],
	['popover-contained', () => render(PopoverContained).body],
	['button-style-hidden', () => render(ButtonStyle, { props: { visible: false } }).body],
	['field-text', () => render(FieldText).body],
]

describe('разметка сервера для гидратации', () => {
	it.each(PAGES)('%s — фикстура совпадает с разметкой сервера', async (fixture, body) => {
		await expect(body()).toMatchFileSnapshot(`./markup/${fixture}.html`)
	})
})
