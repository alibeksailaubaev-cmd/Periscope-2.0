import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

/** Consistent title block at the top of every section. */
export default function SectionHeading({ eyebrow, title, description, icon: Icon, actions }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        {eyebrow && (
          <Badge variant="mint" className="mb-3">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </Badge>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted md:text-[15px]">{description}</p>}
      </div>
      {actions}
    </motion.header>
  )
}
