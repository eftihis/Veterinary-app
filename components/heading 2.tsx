import { LucideIcon } from "lucide-react"

interface HeadingProps {
  title: string
  description: string
  icon?: LucideIcon
}

export function Heading({ title, description, icon: Icon }: HeadingProps) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-md flex items-center justify-center bg-muted">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="space-y-0.5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  )
} 