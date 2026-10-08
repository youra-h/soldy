import { freezeLocale } from '../locale'

/**
 * Арабский (Египет). Египет, а не Саудовская Аравия: у `ar-SA` календарь Intl
 * по умолчанию исламский, а сетка календаря — григорианская.
 */
export const arEG = freezeLocale({
	tag: 'ar-EG',
	translations: {
		modal: { close: 'إغلاق' },
		dialog: { maximize: 'تكبير' },
		popover: { close: 'إغلاق' },
		tabs: { close: 'إغلاق {name}' },
		tags: { close: 'إغلاق {name}' },
		scroller: { prev: 'التمرير للخلف', next: 'التمرير للأمام' },
		field: { clear: 'مسح {name}' },
		table: { selectAll: 'تحديد الكل' },
		calendar: {
			prevMonth: 'الشهر السابق',
			nextMonth: 'الشهر التالي',
			prevYear: 'السنة السابقة',
			nextYear: 'السنة التالية',
			prevYears: 'الـ 12 سنة السابقة',
			nextYears: 'الـ 12 سنة التالية',
		},
		datePicker: {
			trigger: 'اختيار التاريخ',
			start: 'تاريخ البدء',
			end: 'تاريخ الانتهاء',
			confirm: 'حسنًا',
			cancel: 'إلغاء',
		},
	},
})
