/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : '/mmadastemlab';

const nextConfig = {
    ...(basePath ? { basePath, assetPrefix: basePath } : {}),
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
    poweredByHeader: false,
    compress: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts'],
    },
    images: {
        unoptimized: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // DOMPurify uses jsdom only on the server; native canvas must never enter
    // the browser bundle or be parsed by webpack as JavaScript.
    webpack(config, { isServer }) {
        if (isServer) config.externals.push('isomorphic-dompurify');
        else config.resolve.alias['isomorphic-dompurify'] = 'dompurify';
        return config;
    },
    async rewrites() {
        return [
            {
                source: '/dashboard/:role/question%20bank/:path*',
                destination: '/dashboard/:role/question-bank/:path*',
            },
        ];
    },
};

export default nextConfig;
