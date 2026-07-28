// Meta Quest Browser can surface errors from cross-origin CDN scripts only as
// "Script error." with no Error object or usable stack. The game preflight
// already verifies that A-Frame, locomotion, course pieces, and colliders loaded,
// so this opaque event must not replace a healthy course status with a fatal banner.

export function isOpaqueCrossOriginScriptError(event) {
  const message = String(event?.message || "").trim();
  return /^script error\.?$/i.test(message) && !event?.error;
}

export function installOpaqueScriptErrorGuard(target = globalThis.window) {
  if (!target?.addEventListener || target.__FUNFUN_OPAQUE_ERROR_GUARD__) return false;
  target.__FUNFUN_OPAQUE_ERROR_GUARD__ = true;

  target.addEventListener(
    "error",
    (event) => {
      if (!isOpaqueCrossOriginScriptError(event)) return;

      // Preserve useful diagnostics in the developer console while preventing
      // main.js from misclassifying an information-free CDN error as a fatal
      // local game failure.
      console.warn("Ignored opaque cross-origin script error; game preflight remains authoritative.", {
        source: event.filename || "hidden by browser"
      });
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    },
    true
  );
  return true;
}

installOpaqueScriptErrorGuard();
