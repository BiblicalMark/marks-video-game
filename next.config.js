/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // avoid parsing package.json for uniqueName (workaround for parsing issue)
    config.output = config.output || {};
    config.output.uniqueName = 'marks-video-game';
    return config;
  },
};

module.exports = nextConfig;
