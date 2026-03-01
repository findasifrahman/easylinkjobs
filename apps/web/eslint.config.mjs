import nextVitals from "eslint-config-next/core-web-vitals.js";

export default [
  nextVitals,
  {
    rules: {
      "react/jsx-curly-brace-presence": ["warn", { "props": "never", "children": "never" }]
    }
  }
];
