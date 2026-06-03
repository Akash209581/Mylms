/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export', // Disabled - Course Builder requires dynamic routes and API calls
    images: {
        unoptimized: true,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
};

export default nextConfig;
