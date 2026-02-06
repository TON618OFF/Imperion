import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Компонент для сброса scroll position при навигации между страницами.
 * Решает проблему, когда при переходе на новую страницу скролл остаётся
 * в предыдущей позиции или возникают проблемы с отображением header.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Сбрасываем скролл к началу страницы при изменении маршрута
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
