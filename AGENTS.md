# Agents — Contexto y tareas

## Resumen del proyecto
Ahorcado / Hangman es una aplicación web ligera (HTML, CSS, JS) con:
- index.html: estructura y modales.
- style.css: diseño responsivo y variables CSS.
- script.js: lógica del juego (palabras, pistas, teclado, puntuación).
- words.json: base de palabras.
- README.md: info básica y demo.

# Agentes responsabilidades 
-asistir como desarrollador colaborativo en la implementación de nuevas características y mejoras en la aplicación Ahorcado, siguiendo las mejores prácticas de desarrollo web y asegurando una experiencia de usuario fluida y atractiva, debes dar detalle y explicar cada paso a seguir para implementar las siguientes características.

## Características a implementar (tareas)
- tarea: Agregar que se puedan comprar pistas con los puntos que gane
  - Especificación breve: permitir gastar puntos (almacenados en localStorage) para desbloquear pistas adicionales; definir coste por pista; actualizar UI de puntos/racha; proteger contra gasto si no hay puntos suficientes.
  - Criterios de aceptación: al comprar pista, decremento de puntos persistente, pista añadida a usedHintsIdx, animación/confirmación y registro en historial de puntos.

- tarea: Crear menú con botones de navegación para indagar por las páginas del juego
  - Especificación breve: barra o modal de navegación (Inicio / Jugar / Historia / Ajustes); navegación cliente (mostrar/ocultar secciones o rutas simples).
  - Criterios de aceptación: links accesibles desde todas las pantallas, estado activo visible, navegación sin recarga completa.

- tarea: Crear una página que cuente la historia del juego
  - Especificación breve: nueva sección estática (screen-history) con texto sobre origen, reglas, créditos y enlace a contribuciones.
  - Criterios de aceptación: section integrada en layout, responsiva, accesible y enlazable desde el menú.

- tarea: Agregar temas de personalización con modo oscuro/claro
  - Especificación breve: usar variables CSS (:root / [data-theme="dark"]) y un switch en UI; persistir preferencia en localStorage; respetar prefers-color-scheme por defecto.
  - Criterios de aceptación: cambio inmediato de tema, persistencia entre sesiones, contraste suficiente y prueba rápida de accesibilidad.

## Notas de integración rápidas
- Mantener la arquitectura actual: evitar librerías externas; preferir cambios incrementales en index.html, style.css y script.js.
- Persistencia: reutilizar LS_KEYS y localStorage para score/streak y añadir key(s) para tema y monedas/gastos.
- UX: reutilizar modales existentes (hint-modal / result-modal) o crear uno nuevo para confirmación de compra.
- Seguridad / validación: normalizar y verificar operaciones con puntos en el cliente; documentar si se añade backend en el futuro.

## Prioridad sugerida
1. Comprar pistas con puntos (impacto directo en jugabilidad).
2. Menú de navegación (mejora de estructura).
3. Página de historia (contenido informativo).
4. Temas oscuro/claro (mejora UX).

--- 
