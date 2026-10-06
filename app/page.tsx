import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Infrastructure from "@/components/Infrastructure";
import Stats from "@/components/Stats";
import Contact from "@/components/Contact";
import ContactForm from "@/components/ContactForm";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

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
        <ContactForm />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
