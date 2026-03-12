---
name: scrape_vacancies
description: Скрапит вакансии с hh.ru и Хабр Карьера на основе настроек SearchConfig, сохраняет новые вакансии в Vacancy, логирует запуски в ScraperLog
argument-hint: []
---

Запускается автоматически по расписанию или вручную.
Читает настройки из SearchConfig, скрапит hh.ru и Habr Career, дедуплицирует по hash, сохраняет новые вакансии.
