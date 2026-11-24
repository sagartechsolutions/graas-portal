import Link from "next/link";

export default function NotFound() {
  return (
    <section className="blueprint mx-auto flex min-h-[60vh] max-w-[1320px] flex-col justify-center px-5 py-20 sm:px-8">
      <p className="readout text-cobalt">Error 404</p>
      <h1 className="display mt-3 text-[clamp(3.4rem,11vw,7rem)]">That page is out of reach.</h1>
      <p className="lede mt-5">The address may be mistyped, or the page has moved.</p>
      <p className="mt-8">
        <Link href="/" className="btn btn-go">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
