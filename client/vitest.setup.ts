if (!("navigator" in globalThis)) {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node.js" },
    configurable: true
  });
}
