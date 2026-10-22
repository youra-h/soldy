---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
---

Menu: переключатели — `Menu.RadioGroup` со своим значением (`v-model:value`) и `Menu.RadioItem` внутри неё. В группе отмечен один переключатель: нажатие отмечает его и меню не закрывает, значение группы и отметка связаны в обе стороны, а группу переключатель берёт по месту в разметке. В ядре — `TMenuRadioGroup`, `TMenuRadioItem` и нажатие `checkItem` у расширения меню.
