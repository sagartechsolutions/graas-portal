import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[60vh] flex-col justify-center py-16">
      <p className="chip self-start">
        <span className="dot" />
        Page not found
      </p>
      <h1 className="h-display mt-5">That page is out of reach.</h1>
      <p className="lede mt-5">The address may be mistyped, or the page has moved.</p>
      <p className="mt-8">
        <Link href="/" className="btn btn-primary">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
