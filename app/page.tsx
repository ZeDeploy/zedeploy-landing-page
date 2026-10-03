import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Infrastructure from "@/components/Infrastructure";
import Stats from "@/components/Stats";
import Contact from "@/components/Contact";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <Infrastructure />
        <Stats />
        <Contact />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
