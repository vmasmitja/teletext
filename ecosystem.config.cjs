module.exports = {
  apps: [
    {
      name: "teletext",
      script: "server/index.js",
      cwd: "/var/www/teletext",
      env: {
        NODE_ENV: "production",
        PORT: "5173",
        PUBLIC_BASE_URL: "https://teletext.espai42.org",
      },
    },
  ],
};
