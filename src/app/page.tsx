import Benefits from "@/components/home/Benefits";
import Climb from "@/components/home/Climb";
import Faq from "@/components/home/Faq";
import GalleryStrip from "@/components/home/GalleryStrip";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import JoinBand from "@/components/home/JoinBand";
import Lab from "@/components/home/Lab";
import Plans from "@/components/home/Plans";
import RulesGlance from "@/components/home/RulesGlance";
import Ticker from "@/components/home/Ticker";
import UpdatesPreview from "@/components/home/UpdatesPreview";

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <Benefits />
      <HowItWorks />
      <Climb />
      <Lab />
      <Plans />
      <RulesGlance />
      <GalleryStrip />
      <UpdatesPreview />
      <Faq />
      <JoinBand />
    </>
  );
}
