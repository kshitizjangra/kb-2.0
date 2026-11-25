import Hero from '@/components/Hero'
import Reveal from '@/components/motion/Reveal'
import WhoIAm from '@/components/sections/WhoIAm'
import AboutCollage from '@/components/sections/AboutCollage'
import Services from '@/components/sections/Services'
import Experience from '@/components/sections/Experience'
import Work from '@/components/sections/Work'
import LinkedInShowcase from '@/components/sections/LinkedInShowcase'
import CreatorLife from '@/components/sections/CreatorLife'
import FreeResource from '@/components/sections/FreeResource'
import Testimonials from '@/components/sections/Testimonials'
import TopmateConnect from '@/components/sections/TopmateConnect'
import Contact from '@/components/sections/Contact'
import SiteFooter from '@/components/sections/SiteFooter'
import { getSiteCmsData } from '@/lib/cms.server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const cms = await getSiteCmsData()
  const { toggles } = cms

  return (
    <main id="top">
      <Hero data={cms.hero} siteData={cms.site} />

      {toggles.showWhoIAm && <WhoIAm data={cms.whoIAm} />}

      {toggles.showAboutCollage && (
        <Reveal>
          <AboutCollage data={cms.aboutCollage} siteData={cms.site} />
        </Reveal>
      )}

      {toggles.showServices && <Services data={cms.services} />}

      {toggles.showExperience && (
        <Reveal>
          <Experience data={cms.experience} />
        </Reveal>
      )}

      {toggles.showWork && (
        <>
          <hr className="rule" />
          <Reveal>
            <Work data={cms.work} />
          </Reveal>
        </>
      )}

      {toggles.showLinkedIn && (
        <>
          <hr className="rule" />
          <Reveal>
            <LinkedInShowcase data={cms.linkedin} siteData={cms.site} />
          </Reveal>
        </>
      )}

      {toggles.showCreatorLife && (
        <>
          <hr className="rule" />
          <Reveal>
            <CreatorLife data={cms.creatorLife} />
          </Reveal>
        </>
      )}

      {toggles.showFreeResource && (
        <>
          <hr className="rule" />
          <Reveal>
            <FreeResource data={cms.freeResource} />
          </Reveal>
        </>
      )}

      {toggles.showTestimonials && (
        <>
          <hr className="rule" />
          <Reveal>
            <Testimonials data={cms.testimonials} />
          </Reveal>
        </>
      )}

      {toggles.showTopmate && (
        <>
          <hr className="rule" />
          <Reveal>
            <TopmateConnect
              data={cms.topmate}
              newsletterData={cms.newsletter}
            />
          </Reveal>
        </>
      )}

      {toggles.showContact && (
        <Reveal>
          <Contact data={cms.contact} />
        </Reveal>
      )}

      <SiteFooter siteData={cms.site} />
    </main>
  )
}
