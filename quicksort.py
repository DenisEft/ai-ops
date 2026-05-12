"""Быстрая сортировка (Quicksort) — средняя сложность O(n log n)."""


def quicksort(arr: list) -> list:
    """Рекурсивная реализация на основе срезов (простая, но не in-place)."""
    # Базовый случай: массив из 0 или 1 элемента уже отсортирован
    if len(arr) <= 1:
        return arr

    # Выбираем опорный элемент (средний — хорошая практика, чтобы избежать O(n²))
    pivot = arr[len(arr) // 2]

    # Распределяем элементы в три корзины
    left   = [x for x in arr if x < pivot]   # меньше опорного
    middle = [x for x in arr if x == pivot]   # равные опорному
    right  = [x for x in arr if x > pivot]    # больше опорного

    # Рекурсивно сортируем левую и правую части, склеиваем
    return quicksort(left) + middle + quicksort(right)


def quicksort_inplace(arr: list, low: int = 0, high: int = None) -> None:
    """In-place версия (сортирует массив на месте, без额外 памяти)."""
    if high is None:
        high = len(arr) - 1

    # Пока границы не пересеклись — продолжаем
    if low < high:
        # Разделяем массив и получаем индекс опорного
        pi = _partition(arr, low, high)
        # Рекурсивно сортируем левую и правую части
        quicksort_inplace(arr, low, pi - 1)
        quicksort_inplace(arr, pi + 1, high)


def _partition(arr: list, low: int, high: int) -> int:
    """
    Partition — алгоритм Ломпо (Lomuto) с выбором последнего элемента как pivot.
    Возвращает индекс, на котором оказался опорный элемент.
    Все элементы слева ≤ pivot, все справа ≥ pivot.
    """
    pivot = arr[high]          # Опорный — последний элемент
    i = low - 1                # Граница «меньшей» части

    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]   # Меняем местами — «меньший» элемент переходит в левую часть

    # Ставим pivot на его правильное место
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


# ── Демо ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import random

    data = list(range(20))
    random.shuffle(data)
    print(f"До:   {data}")

    # Простая версия — возвращает новый массив
    sorted_arr = quicksort(data)
    print(f"После (срез): {sorted_arr}")

    # In-place версия — меняет массив на месте
    quicksort_inplace(data)
    print(f"После (in-place): {data}")
