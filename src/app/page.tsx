import Benefits from "@/components/home/Benefits";
import Climb from "@/components/home/Climb";
import Faq from "@/components/home/Faq";
import GalleryStrip from "@/components/home/GalleryStrip";
import Hero from "@/components/home/Hero";
import Lab from "@/components/home/Lab";
import Plans from "@/components/home/Plans";
import PreRegister from "@/components/home/PreRegister";
import UpdatesPreview from "@/components/home/UpdatesPreview";

export default function Home() {
  return (
    <>
      <Hero />
      <Benefits />
      <Climb />
      <Lab />
      <Plans />
      <GalleryStrip />
      <UpdatesPreview />
      <Faq />
      <PreRegister />
    </>
  );
}
