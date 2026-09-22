// Russian plural rules for the selected-cities counter:
// 1 объект, 2–4 объекта, 0/5–20 объектов (with 11–14 exception).
// Shared by CityListScreen (header) and ConfirmDeleteModal so both always agree.
export function getPluralSelectedText(count, t) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return t('cities.selected_count_one', { count });
  }
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return t('cities.selected_count_few', { count });
  }
  return t('cities.selected_count_many', { count });
}
