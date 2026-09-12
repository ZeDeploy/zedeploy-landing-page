import Image from "next/image";

export default function Footer() {
  return (
    <footer className="footer">
      <Image
        src="/zedeploy_logo.png"
        alt="ZeDeploy logo"
        width={130}
        height={130}
        className="footer-logo"
      />
      <p>
        &copy; 2026 ZeDeploy. All rights reserved. | Building the future of
        cloud infrastructure
      </p>
    </footer>
  );
}
