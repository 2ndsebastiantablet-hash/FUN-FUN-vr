// Visual calibration that keeps the KayKit ramp aligned with its Phase 2
// ten-step collision approximation without changing the source asset file.

const SLOPE_PIECE_ID = "slope-platform";

function applySlopeCalibration() {
  const slopePiece = document.getElementById(SLOPE_PIECE_ID);
  if (!slopePiece || slopePiece.dataset.visualCalibration === "complete") return false;

  const model = slopePiece.querySelector(`[data-course-model="${SLOPE_PIECE_ID}"]`);
  const fallback = slopePiece.querySelector('[data-course-fallback="platform-slope-blue"]');
  if (!model || !fallback) return false;

  // The source mesh rises 4 m. The mechanics course rises from 1 m to 3 m,
  // so compress only the visible model vertically and lift it into alignment.
  model.setAttribute("position", "0 2 0");
  model.setAttribute("scale", "1 0.5 1");

  // The fallback starts as a 4 m-tall bounds box centered at local y=2.
  // Move its center to y=3 and halve its vertical scale so it also spans 1–3 m.
  fallback.setAttribute("position", "0 3 0");
  fallback.setAttribute("scale", "1 0.5 1");

  slopePiece.dataset.visualCalibration = "complete";
  window.dispatchEvent(new CustomEvent("course-calibration-complete", {
    detail: {
      pieceId: SLOPE_PIECE_ID,
      visualRise: 2,
      collisionSteps: 10
    }
  }));
  return true;
}

function installCalibration() {
  if (applySlopeCalibration()) return;

  const onCourseBuilt = function () {
    if (applySlopeCalibration()) {
      window.removeEventListener("course-built", onCourseBuilt);
    }
  };
  window.addEventListener("course-built", onCourseBuilt);

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (applySlopeCalibration() || attempts >= 100) {
      window.clearInterval(timer);
      window.removeEventListener("course-built", onCourseBuilt);
    }
  }, 50);
}

installCalibration();
