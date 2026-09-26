import { describe, it, expect } from 'vitest'
import {
	ButtonDescriptor,
	FrameDescriptor,
	SliderDescriptor,
	ValueControlDescriptor,
	defineComponent,
	type IComponentDescriptor,
} from '@soldy-ui/setup'
import { buildAttributeMap, coerceAttribute } from '@soldy-ui/webc'

/**
 * Значение пропа из строки атрибута — тем же путём, что у элемента: карта
 * атрибутов дескриптора, затем приведение. `null` — атрибут снят.
 */
function coerce(descriptor: IComponentDescriptor, attribute: string, raw: string | null): unknown {
	const binding = buildAttributeMap(descriptor).get(attribute)

	if (!binding) throw new Error(`Атрибута ${attribute} нет в карте`)

	return coerceAttribute(raw, binding)
}

/**
 * Атрибут приводится по типам пропа в порядке объявления: значение даёт первый
 * тип, который строку принимает. Раньше порядок не учитывался — булев или
 * числовой тип где угодно в списке решал за все: `value="abc"` у полей давал
 * `true`, а `width="50%"` у окна пропадал.
 */
describe('атрибут · Boolean первым — HTML-семантика', () => {
	it('у disabled кнопки значимо наличие, а не содержимое', () => {
		expect(coerce(ButtonDescriptor(), 'disabled', '')).toBe(true)
		expect(coerce(ButtonDescriptor(), 'disabled', 'false')).toBe(true)
		expect(coerce(ButtonDescriptor(), 'disabled', null)).toBe(false)
	})

	it('marks у Slider ([Boolean, Array]) — наличие, даже со списком в значении', () => {
		expect(coerce(SliderDescriptor(), 'marks', '')).toBe(true)
		expect(coerce(SliderDescriptor(), 'marks', '[0, 50, 100]')).toBe(true)
		expect(coerce(SliderDescriptor(), 'marks', null)).toBe(false)
	})
})

describe('атрибут · типы по порядку объявления', () => {
	it('value полей ([String, Number, Boolean, Object, Array]) остаётся строкой', () => {
		expect(coerce(ValueControlDescriptor(), 'value', 'abc')).toBe('abc')
		expect(coerce(ValueControlDescriptor(), 'value', '42')).toBe('42')
		expect(coerce(ValueControlDescriptor(), 'value', '')).toBe('')
	})

	it('снятый value — «не задан», а не false: Boolean в его типе не первый', () => {
		expect(coerce(ValueControlDescriptor(), 'value', null)).toBeUndefined()
	})

	it('width у Frame ([Number, String]) — число, если разобралось, иначе строка', () => {
		expect(coerce(FrameDescriptor(), 'width', '240')).toBe(240)
		expect(coerce(FrameDescriptor(), 'width', '50%')).toBe('50%')
		expect(coerce(FrameDescriptor(), 'width', null)).toBeUndefined()
	})

	it('value у Slider ([Number, Array]) — число или JSON-массив', () => {
		expect(coerce(SliderDescriptor(), 'value', '42')).toBe(42)
		expect(coerce(SliderDescriptor(), 'value', '[20, 80]')).toEqual([20, 80])
	})
})

describe('атрибут · строка, которую не принял ни один тип, — «не задан»', () => {
	it('Number не принимает пустую и неразобранную строку', () => {
		expect(coerce(FrameDescriptor(), 'x', '12')).toBe(12)
		expect(coerce(FrameDescriptor(), 'x', '')).toBeUndefined()
		expect(coerce(FrameDescriptor(), 'x', '  ')).toBeUndefined()
		expect(coerce(FrameDescriptor(), 'x', 'abc')).toBeUndefined()
	})

	it('Array принимает только JSON-массив', () => {
		expect(coerce(SliderDescriptor(), 'thumb-labels', '["От", "До"]')).toEqual(['От', 'До'])
		expect(coerce(SliderDescriptor(), 'thumb-labels', '{"from": "От"}')).toBeUndefined()
		expect(coerce(SliderDescriptor(), 'thumb-labels', 'От')).toBeUndefined()
	})

	it('Object принимает только JSON-объект', () => {
		expect(coerce(ButtonDescriptor(), 'plugin-props', '{"timer_ms": 500}')).toEqual({
			timer_ms: 500,
		})
		expect(coerce(ButtonDescriptor(), 'plugin-props', '[500]')).toBeUndefined()
		expect(coerce(ButtonDescriptor(), 'plugin-props', 'null')).toBeUndefined()
		expect(coerce(ButtonDescriptor(), 'plugin-props', 'timer')).toBeUndefined()
	})
})

describe('атрибут · проп без типа', () => {
	/** Тип у пропа необязателен; в дескрипторах экспорта таких нет. */
	const HintDescriptor = defineComponent({
		ctor: class {
			hint = ''
		},
		contribution: { props: { hint: {} } },
	})

	it('принимает строку как есть: проп без типа, как во Vue, принимает любое значение', () => {
		expect(coerce(HintDescriptor, 'hint', 'abc')).toBe('abc')
		expect(coerce(HintDescriptor, 'hint', '')).toBe('')
		expect(coerce(HintDescriptor, 'hint', null)).toBeUndefined()
	})
})
