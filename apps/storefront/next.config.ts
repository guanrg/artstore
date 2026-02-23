import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "auctions.c.yimg.jp",
      },
      {
        protocol: "https",
        hostname: "auc-pctr.c.yimg.jp",
      },
      {
        protocol: "https",
        hostname: "displayname-pctr.c.yimg.jp",
      },
      {
        protocol: "https",
        hostname: "auctions.afimg.jp",
      },
      {
        protocol: "https",
        hostname: "s.yimg.jp",
      },
      {
        protocol: "https",
        hostname: "images.auctions.yahoo.co.jp",
      },
    ],
  },
};

export default nextConfig;
