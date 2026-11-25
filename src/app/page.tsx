import EventsBand from "@/components/home/EventsBand";
import OpportunitiesBand from "@/components/home/OpportunitiesBand";
import Audiences from "@/components/home/Audiences";
import Benefits from "@/components/home/Benefits";
import ChaptersBand from "@/components/home/ChaptersBand";
import Climb from "@/components/home/Climb";
import Facts from "@/components/home/Facts";
import Faq from "@/components/home/Faq";
import GalleryStrip from "@/components/home/GalleryStrip";
import Hero from "@/components/home/Hero";
import JoinBand from "@/components/home/JoinBand";
import Lab from "@/components/home/Lab";
import Ticker from "@/components/home/Ticker";
import UpdatesPreview from "@/components/home/UpdatesPreview";
import WhatIsGraas from "@/components/home/WhatIsGraas";
import { getChapterSettings, getTerms } from "@/lib/data";

/** Home: what GRAAS is, who it is for and why people join. Fees and payment live on the membership page. */
export default async function Home() {
  const [chapters, terms] = await Promise.all([getChapterSettings(), getTerms()]);
  const maxDiscount = Math.max(0, ...terms.map((t) => Number(t.discount_percent)));
  return (
    <>
      <Hero />
      <Ticker />
      <WhatIsGraas />
      <Facts freeSeats={chapters.free_seats} maxDiscount={maxDiscount || 40} />
      <Audiences />
      <Benefits />
      <EventsBand />
      <OpportunitiesBand />
      <ChaptersBand freeSeats={chapters.free_seats} minMembers={chapters.min_members} />
      <Climb />
      <Lab />
      <GalleryStrip />
      <UpdatesPreview />
      <Faq />
      <JoinBand
        title="Be part of the robotics generation."
        text="See every benefit for your kind of membership, join online in a few minutes, or bring GRAAS to your college or school as a chapter."
      />
    </>
  );
}
