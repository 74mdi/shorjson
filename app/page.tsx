import UrlShortener from "@/components/UrlShortener";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col items-center overflow-hidden px-5">
      {/* Single centered zone — pb-10 offsets the fixed bottom bar */}
      <div className="flex flex-1 w-full max-w-sm flex-col items-center justify-center pb-10">
        <UrlShortener />
      </div>
    </main>
  );
}
