---
'@soldy-ui/angular': minor
---

Angular: компонент отдаёт базе setup-функцию в конструкторе — super(setupButton, { strategy: 'host' }); абстрактного createBinding больше нет, имена входов подставляет сгенерированная T<Имя>Surface. Сломалось: свой компонент на TComponentBase или T<Имя>Surface вместо createBinding передаёт setup-функцию конструктору (владелец коллекции — стрелкой с this.engine); generated/*.metadata.ts отдаёт XInputNames и XOutputNames напрямую, файлов base.component.ts нет. Методы-пересылки шаблонов (choose, toggle, check, openPanel, confirm, toggleSort, toggleMaximized, close у Dialog, Drawer и тоста) заменены вызовом в шаблоне. standalone: true убран как умолчание.
