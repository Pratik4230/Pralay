/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function mediaCdnRemotePattern() {
  const cdnUrl = process.env.NEXT_PUBLIC_MEDIA_CDN_URL;
  if (!cdnUrl) {
    return null;
  }

  try {
    const parsed = new URL(cdnUrl);
    const protocol = parsed.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") {
      return null;
    }

    return {
      protocol,
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

const remotePatterns = [
  {
    protocol: "http",
    hostname: "localhost",
  },
  {
    protocol: "https",
    hostname: "**.amazonaws.com",
  },
];

const mediaCdnPattern = mediaCdnRemotePattern();
if (mediaCdnPattern) {
  remotePatterns.push(mediaCdnPattern);
}

const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns,
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
