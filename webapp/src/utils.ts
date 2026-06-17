/**
 * Instantly scrolls to the top of the page without animation.
 * Because router is wrapped in a BaseLayout, window.scrollTo({ top: 0 }) doesn't work.
 */
export function scrollToTop() {
  const appElement = document.getElementById("base-container");
  if (appElement !== null) {
    appElement.scrollTop = 0;
  }
}
