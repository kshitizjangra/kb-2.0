'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { PaperClip, Tape } from '@/components/collage/Decor'
import EmailGateModal from '@/components/EmailGateModal'
import { DEFAULT_CMS_DATA, type SiteCmsData } from '@/lib/cms-schema'
import './free-resource.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface FreeResourceProps {
  data?: SiteCmsData['freeResource']
}

export default function FreeResource({
  data = DEFAULT_CMS_DATA.freeResource,
}: FreeResourceProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const reduce = useReducedMotion()

  return (
    <section
      id="download"
      className="free-resource section"
      aria-labelledby="free-resource-title"
    >
      <div className="wrap fr-grid">
        <div className="fr-dossier-stage">
          <div className="fr-backing paper paper--kraft" aria-hidden="true" />

          <motion.button
            type="button"
            className="fr-dossier paper"
            whileHover={reduce ? undefined : { y: -3 }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            transition={{ duration: 0.18, ease: EASE }}
            onClick={() => setModalOpen(true)}
            aria-label={`${data.cta}: ${data.title}`}
          >
            <Tape
              variant="pink"
              className="fr-tape"
              style={{
                width: 78,
                height: 20,
                left: '50%',
                top: -10,
                transform: 'translateX(-50%) rotate(-4deg)',
              }}
            />
            <PaperClip className="fr-clip" />

            <span className="fr-dossier-top">
              <span>100 creators decoded</span>
              <span>PDF</span>
            </span>

            <span className="fr-dossier-num display" aria-hidden="true">
              100
            </span>

            <span className="fr-dossier-title serif">
              Decoded: 100 Top LinkedIn Creators
            </span>

            <span className="fr-dossier-rule" aria-hidden="true" />

            <span className="fr-dossier-sub">
              Headlines that convert and about sections that sell
            </span>

            <span className="fr-dossier-foot">
              <span>{data.joined}</span>
              <span className="fr-dossier-open">
                Open PDF
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </span>
          </motion.button>
        </div>

        <div className="fr-copy">
          <span className="eyebrow fr-eyebrow">{data.eyebrow}</span>

          <h2 id="free-resource-title" className="fr-title serif">
            {data.title}
          </h2>

          <p className="fr-desc muted">{data.description}</p>

          <div className="fr-actions">
            <motion.button
              type="button"
              className="fr-cta"
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.14, ease: EASE }}
              onClick={() => setModalOpen(true)}
            >
              {data.cta}
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </motion.button>
            <span className="small-caps fr-joined">{data.joined}</span>
          </div>

          <blockquote className="fr-quote">
            <p className="serif-italic">“{data.quote}”</p>
          </blockquote>
        </div>
      </div>

      {modalOpen ? (
        <EmailGateModal open={modalOpen} onClose={() => setModalOpen(false)} />
      ) : null}
    </section>
  )
}
