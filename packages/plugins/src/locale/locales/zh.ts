import { freezeLocale } from '../locale'

/** Китайский (Китай, упрощённое письмо). */
export const zhCN = freezeLocale({
	tag: 'zh-CN',
	translations: {
		modal: { close: '关闭' },
		dialog: { maximize: '最大化' },
		popover: { close: '关闭' },
		tabs: { close: '关闭{name}' },
		tags: { close: '关闭{name}', more: '更多' },
		scroller: { prev: '向前滚动', next: '向后滚动' },
		field: { clear: '清除{name}' },
		table: { selectAll: '全选' },
		calendar: {
			prevMonth: '上个月',
			nextMonth: '下个月',
			prevYear: '上一年',
			nextYear: '下一年',
			prevYears: '前 12 年',
			nextYears: '后 12 年',
		},
		datePicker: { trigger: '选择日期', start: '开始日期', end: '结束日期' },
	},
})
