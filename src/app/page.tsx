import Hero from "@/components/home/Hero";
import Journey from "@/components/home/Journey";
import PreRegister from "@/components/home/PreRegister";
import Roles from "@/components/home/Roles";
import { Conveyor, GraasconBand, Plans } from "@/components/home/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <Conveyor />
      <Journey />
      <GraasconBand />
      <Roles />
      <Plans />
      <PreRegister />
    </>
  );
}
