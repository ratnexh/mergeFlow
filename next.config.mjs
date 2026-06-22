/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  output: "export",
  basePath: isGithubActions ? "/rawPDF" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
