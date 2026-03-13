/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export', // Disabled - Course Builder requires dynamic routes and API calls
    images: {
        unoptimized: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
