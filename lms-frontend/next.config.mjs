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
                source: '/dashboard/question_creator/question-bank/:path*',
                destination: '/dashboard/instructor/question-bank/:path*',
            },
            {
                source: '/dashboard/question_creator/question%20bank/:path*',
                destination: '/dashboard/instructor/question-bank/:path*',
            },
            {
                source: '/dashboard/question_creator/:path*',
                destination: '/dashboard/instructor/:path*',
            },
            {
                source: '/dashboard/content_creator/:path*',
                destination: '/dashboard/instructor/:path*',
            },
            {
                source: '/dashboard/:role/question%20bank/:path*',
                destination: '/dashboard/:role/question-bank/:path*',
            },
        ];
    },
};

export default nextConfig;
