const path = require("path");

module.exports = {
  stories: ["../src/**/*.stories.@(js|jsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/preset-create-react-app",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  webpackFinal: async (config) => {
    // Mismo alias "@/..." que usa craco/CRA para apuntar a src/
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "../src"),
    };
    return config;
  },
};
