import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
  margin?: number;
  quality?: number;
}

/**
 * Экспорт HTML элемента в PDF с поддержкой UTF-8 и светлой темой.
 * Использует html2canvas для рендеринга, что гарантирует корректное
 * отображение всех символов и стилей.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = "document.pdf",
    title,
    orientation = "portrait",
    margin = 10,
    quality = 2,
  } = options;

  // Создаём временную копию элемента для светлой темы
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Применяем светлую тему для печати
  applyLightTheme(clone);
  
  // Добавляем клон в DOM (скрытый)
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${element.offsetWidth}px`;
  container.style.background = "#ffffff";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Рендерим HTML в canvas с высоким качеством
    const canvas = await html2canvas(clone, {
      scale: quality,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // Создаём PDF документ
    const imgWidth = orientation === "portrait" ? 210 : 297;
    const imgHeight = orientation === "portrait" ? 297 : 210;
    const pageWidth = imgWidth - margin * 2;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    // Добавляем заголовок если указан
    if (title) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(title, margin, margin + 5);
    }

    const startY = title ? margin + 15 : margin;
    const contentHeight = imgHeight - startY - margin;
    
    // Рассчитываем размеры изображения
    let finalWidth = pageWidth;
    let finalHeight = finalWidth / ratio;
    
    // Если контент не помещается на одну страницу
    if (finalHeight > contentHeight) {
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      // Разбиваем на страницы
      const totalPages = Math.ceil(finalHeight / contentHeight);
      const pageCanvasHeight = (canvasHeight / totalPages);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Создаём canvas для текущей страницы
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = pageCanvasHeight;
        const ctx = pageCanvas.getContext("2d");
        
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, page * pageCanvasHeight,
            canvasWidth, pageCanvasHeight,
            0, 0,
            canvasWidth, pageCanvasHeight
          );
          
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
          const pageRatio = pageCanvas.width / pageCanvas.height;
          const pageImgHeight = pageWidth / pageRatio;
          
          pdf.addImage(
            pageImgData,
            "JPEG",
            margin,
            page === 0 ? startY : margin,
            pageWidth,
            pageImgHeight
          );
        }
      }
    } else {
      // Контент помещается на одну страницу
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", margin, startY, finalWidth, finalHeight);
    }

    // Сохраняем PDF
    pdf.save(filename);
  } finally {
    // Удаляем временный контейнер
    document.body.removeChild(container);
  }
}

/**
 * Применяет светлую тему к элементу для печати
 */
function applyLightTheme(element: HTMLElement): void {
  // Базовые стили для светлой темы
  element.style.backgroundColor = "#ffffff";
  element.style.color = "#1a1a1a";
  
  // Рекурсивно обрабатываем все дочерние элементы
  const allElements = element.querySelectorAll("*") as NodeListOf<HTMLElement>;
  
  allElements.forEach((el) => {
    const computedStyle = window.getComputedStyle(el);
    
    // Заменяем тёмные фоны на светлые
    const bgColor = computedStyle.backgroundColor;
    if (bgColor && isColorDark(bgColor)) {
      el.style.backgroundColor = "#f5f5f5";
    }
    
    // Заменяем светлый текст на тёмный
    const textColor = computedStyle.color;
    if (textColor && isColorLight(textColor)) {
      el.style.color = "#1a1a1a";
    }
    
    // Обрабатываем SVG элементы (иконки, диаграммы)
    if (el.tagName === "svg" || el.closest("svg")) {
      const fills = el.querySelectorAll("[fill]");
      fills.forEach((fillEl) => {
        const fill = fillEl.getAttribute("fill");
        if (fill && isColorLight(fill)) {
          fillEl.setAttribute("fill", "#1a1a1a");
        }
      });
      
      const strokes = el.querySelectorAll("[stroke]");
      strokes.forEach((strokeEl) => {
        const stroke = strokeEl.getAttribute("stroke");
        if (stroke && isColorLight(stroke)) {
          strokeEl.setAttribute("stroke", "#1a1a1a");
        }
      });
    }
    
    // Обрабатываем Recharts диаграммы
    if (el.classList.contains("recharts-surface")) {
      el.style.backgroundColor = "#ffffff";
    }
    
    // Обрабатываем границы
    const borderColor = computedStyle.borderColor;
    if (borderColor && isColorLight(borderColor)) {
      el.style.borderColor = "#e5e5e5";
    }
    
    // Убираем backdrop-blur и полупрозрачности для чистой печати
    el.style.backdropFilter = "none";
    el.style.webkitBackdropFilter = "none";
    
    // Убираем тени для экономии чернил
    el.style.boxShadow = "none";
    el.style.textShadow = "none";
  });
  
  // Специальная обработка для карточек
  const cards = element.querySelectorAll("[class*='card']") as NodeListOf<HTMLElement>;
  cards.forEach((card) => {
    card.style.backgroundColor = "#ffffff";
    card.style.border = "1px solid #e5e5e5";
  });
  
  // Специальная обработка для бейджей
  const badges = element.querySelectorAll("[class*='badge']") as NodeListOf<HTMLElement>;
  badges.forEach((badge) => {
    badge.style.backgroundColor = "#f0f0f0";
    badge.style.color = "#1a1a1a";
    badge.style.border = "1px solid #d0d0d0";
  });
}

/**
 * Проверяет, является ли цвет тёмным
 */
function isColorDark(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

/**
 * Проверяет, является ли цвет светлым
 */
function isColorLight(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.7;
}

/**
 * Парсит цвет в RGB формат
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color || color === "transparent" || color === "inherit") return null;
  
  // rgba(r, g, b, a) или rgb(r, g, b)
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
    };
  }
  
  // #rrggbb или #rgb
  const hexMatch = color.match(/^#([0-9a-f]{3,6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  
  return null;
}

/**
 * Экспорт статистики/отчёта в PDF
 */
export async function exportReportToPDF(
  containerId: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error(`Element with id "${containerId}" not found`);
  }
  
  await exportElementToPDF(element, options);
}

/**
 * Экспорт лекции в PDF с поддержкой UTF-8 (кириллица и все символы)
 * Использует html2canvas для корректного рендеринга текста
 */
export async function exportLectureToPDF(
  title: string,
  sections: Array<{ title: string | null; content: string }>,
  options: PDFExportOptions = {}
): Promise<void> {
  const { filename = `${title}.pdf` } = options;
  
  // Создаём HTML контейнер со светлой темой
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 794px;
    padding: 20px 24px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.5;
    box-sizing: border-box;
  `;
  
  // Заголовок
  const titleEl = document.createElement("h1");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-size: 20px;
    font-weight: bold;
    margin: 0 0 10px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #f59e0b;
    color: #1a1a1a;
  `;
  container.appendChild(titleEl);
  
  // Секции
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    
    if (sec.title) {
      const secTitle = document.createElement("h2");
      secTitle.textContent = sec.title;
      secTitle.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        margin: 14px 0 8px 0;
        color: #1a1a1a;
      `;
      container.appendChild(secTitle);
    }
    
    // Парсим markdown в HTML
    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = markdownToHTML(sec.content);
    contentDiv.style.cssText = `color: #333333; font-size: 13px;`;
    container.appendChild(contentDiv);
    
    // Разделитель
    if (i < sections.length - 1) {
      const hr = document.createElement("hr");
      hr.style.cssText = `
        margin: 14px 0;
        border: none;
        border-top: 1px solid #e5e5e5;
      `;
      container.appendChild(hr);
    }
  }
  
  document.body.appendChild(container);
  
  // Даём браузеру время на рендер
  await new Promise(r => setTimeout(r, 50));
  
  try {
    // Рендерим в canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    
    // Создаём PDF
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5;
    const contentWidth = pageWidth - margin * 2;
    
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageContentHeight = pageHeight - margin * 2;
    
    // Разбиваем на страницы
    let heightLeft = imgHeight;
    let position = 0;
    let page = 0;
    
    while (heightLeft > 0) {
      if (page > 0) pdf.addPage();
      
      // Вычисляем область для текущей страницы
      const sourceY = position * (canvas.height / imgHeight);
      const sourceHeight = Math.min(pageContentHeight, heightLeft) * (canvas.height / imgHeight);
      
      // Создаём canvas для страницы
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext("2d");
      
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, sourceY,
          canvas.width, sourceHeight,
          0, 0,
          canvas.width, sourceHeight
        );
        
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
        const drawHeight = Math.min(pageContentHeight, heightLeft);
        pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, drawHeight);
      }
      
      heightLeft -= pageContentHeight;
      position += pageContentHeight;
      page++;
    }
    
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Конвертирует Markdown в HTML для PDF
 */
function markdownToHTML(md: string): string {
  let html = md;
  
  // Блоки кода
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => 
    `<pre style="background:#f5f5f5;padding:8px 10px;margin:6px 0;border-radius:4px;font-family:Consolas,Monaco,monospace;font-size:11px;overflow-x:auto;border:1px solid #e0e0e0;white-space:pre-wrap;word-break:break-all;"><code>${escapeHTML(code.trim())}</code></pre>`
  );
  
  // Инлайн код
  html = html.replace(/`([^`]+)`/g, 
    '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-family:Consolas,Monaco,monospace;font-size:11px;">$1</code>'
  );
  
  // Заголовки
  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:bold;margin:10px 0 5px;color:#1a1a1a;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:bold;margin:12px 0 6px;color:#1a1a1a;">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:15px;font-weight:bold;margin:14px 0 7px;color:#1a1a1a;">$1</h2>');
  
  // Форматирование
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Списки
  html = html.replace(/^- (.+)$/gm, '<div style="margin:2px 0 2px 16px;">• $1</div>');
  html = html.replace(/^\d+\. (.+)$/gm, '<div style="margin:2px 0 2px 16px;">• $1</div>');
  
  // Параграфы
  html = html.replace(/\n\n+/g, '</p><p style="margin:6px 0;">');
  html = html.replace(/\n/g, '<br>');
  
  if (!html.startsWith('<')) {
    html = `<p style="margin:6px 0;">${html}</p>`;
  }
  
  return html;
}

function escapeHTML(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
