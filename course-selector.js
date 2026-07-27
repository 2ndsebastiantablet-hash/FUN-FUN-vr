import { createCourseUrl, readCourseRequest, setupCourseModeControls } from "./course-modules.js";

function start() {
  const request = readCourseRequest();
  const onGeneratedPage = location.pathname.endsWith("/generated.html");

  // Redirect stale root links that used the earlier same-page generated format.
  if (request.mode === "generated" && !onGeneratedPage) {
    location.replace(createCourseUrl(request));
    return;
  }

  setupCourseModeControls();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
