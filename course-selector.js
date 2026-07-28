import "./runtime-error-guard.js";
import { createCourseUrl, readCourseRequest, setupCourseModeControls } from "./course-modules.js";

function start() {
  const request = readCourseRequest();
  const onGeneratedPage = location.pathname.endsWith("/generated.html");

  // Redirect stale root links that used the earlier same-page generated format.
  if (request.mode === "generated" && !onGeneratedPage) {
    location.replace(createCourseUrl(request));
    return;
  }

  // A direct generated.html visit receives the stable default seed in its URL.
  if (onGeneratedPage && request.mode !== "generated") {
    location.replace(createCourseUrl({ mode: "generated", seed: request.seed }));
    return;
  }

  setupCourseModeControls();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
