import type { Metadata } from "next";
import "./globals.css";
import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "zcrX — Security Scanning Platform",
  description:
    "Enterprise-grade SAST, SCA, SBOM & DAST security scanning in one platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
