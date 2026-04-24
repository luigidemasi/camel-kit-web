module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-accent)",
        "primary-hover": "var(--color-accent-hover)",
        bg: "var(--color-bg-primary)",
        "bg-secondary": "var(--color-bg-secondary)",
        card: "var(--color-card-bg)",
        nav: "var(--color-bg-nav)",
        "nav-text": "var(--color-text-nav)",
        border: "var(--color-border)",
        "code-bg": "var(--color-code-bg)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
