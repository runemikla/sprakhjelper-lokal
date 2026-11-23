import Image from 'next/image'

const CREDIT = 'Foto: Silje Alvsaker / Vestland fylkeskommune'

// Fixed Aurlandsfjorden background shared by the tool pages. Render it as the
// first child of a `relative min-h-screen` page root.
// On larger screens the photo credit sits fixed in the corner. On phones it is
// placed at the bottom of the page instead, so it never covers content.
// Pages with a footer pass mobileCredit={false} and render <MobilePhotoCredit />
// at the end of their content.
export function FjordBackground({ mobileCredit = true }: { mobileCredit?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/Aurlandsfjorden-duotone.jpg"
          alt="Aurlandsfjorden bakgrunn"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1d1d1b]/45 via-[#1d1d1b]/15 to-[#1d1d1b]/5" />
        <div className="absolute bottom-4 right-4 z-10 hidden rounded bg-black/20 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm sm:block">
          {CREDIT}
        </div>
      </div>
      {mobileCredit && (
        <p className="absolute inset-x-0 bottom-3 z-10 px-4 text-center text-xs text-white/70 sm:hidden">
          {CREDIT}
        </p>
      )}
    </>
  )
}

// In-flow photo credit for phones, for pages where the bottom of the page is a footer.
export function MobilePhotoCredit() {
  return <p className="mt-6 text-center text-xs text-white/70 sm:hidden">{CREDIT}</p>
}
