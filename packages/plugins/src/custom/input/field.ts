/**
 * Поле формы, которое держит фокус контрола: `input`, кроме скрытого, или
 * `textarea`. Скрытое поле — значение для формы (число NumberInput), фокуса у
 * него нет.
 */
const FIELD_SELECTOR = 'input:not([type="hidden"]), textarea'

/**
 * Поле контрола — первое поле формы в его корне. `null` — поля в корне нет.
 *
 * Узел фокуса компонентов, у которых корень — коробка вокруг поля: Input,
 * NumberInput, Textarea, CheckBox, Switch, Rating, Slider, Select и радио
 * (`focusTarget` плагина действия). По тегу поля, а не первая остановка Tab:
 * кнопка в слоте `leading` и крестики тегов Select стоят перед полем своими
 * остановками, и фокус ушёл бы на них.
 *
 * Тем же правилом поле находят плагины полей: ввод текста (`TInputPlugin`),
 * поле только для чтения (`TInputControlPlugin`), чекбокс и переключатель
 * (`TInputBoolPlugin`), клавиатура, ввод и `Backspace` Select, отметка радио
 * группы и авторост Textarea, — и правка разметки поля не расходится по ним.
 * Нужный тип узла каждый сужает сам (`instanceof`).
 */
export function fieldOf(root: Element): Element | null {
	return root.querySelector(FIELD_SELECTOR)
}
