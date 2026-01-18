/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'profileimg.plaync.com',
            },
            {
                protocol: 'https',
                hostname: '*.plaync.com', // Wildcard for other static assets if needed
            }
        ],
    },
    experimental: {
        caseSensitiveRoutes: false,
        optimizePackageImports: ['lucide-react', 'recharts'],
    },
}

module.exports = nextConfig
