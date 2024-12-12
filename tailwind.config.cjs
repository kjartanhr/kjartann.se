/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "views/**/*.vto",
    ],
    theme: {
        extend: {
            screens: {
                "2xs": "316px",
                "xs": "416px",
            },
            fontFamily: {
                sans: ["Space Grotesk", "sans-serif"],
                mono: ["Space Mono", "mono"],
            },
        },
    },
    plugins: [],
};
