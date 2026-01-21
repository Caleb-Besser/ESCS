const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "./project_icon",
    name: "ESCS",
    executableName: "ESCS",
    overwrite: true,
    appCategoryType: "public.app-category.education",
    appCopyright: "Copyright © 2024 Caleb Besser",
    // Make sure the data folder is included in the build
    extraResource: ["project_icon.ico", "project_icon.png"],
    ignore: [
      /^\/\.vscode/,
      /^\/node_modules\/\.cache/,
      /^\/out/,
      /^\/dist/,
      /^\/\.git/,
      /^\/\.github/,
      /^\/\.gitignore/,
      /^\/README\.md/,
      /^\/forge\.config\.js/,
      /^\/package-lock\.json/,
      /^\/yarn\.lock/,
      /^\/test/,
      /^\/data\/\.gitkeep/, // Ignore gitkeep file if you have it
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "ESCS",
        authors: "Caleb Besser",
        description: "Easy Student Checkout System - Test Version",
        setupIcon: "./project_icon.ico",
        setupExe: "ESCS-Setup.exe",
        noMsi: true,
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
      config: {
        name: "ESCS-Portable",
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
