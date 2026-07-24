import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/news"

type CategoriesNavProps = {
  category: NewsCategory
  onCategoryChange: (category: NewsCategory) => void
}

export function CategoriesNav({ category, onCategoryChange }: CategoriesNavProps) {
  return (
    <nav aria-label="Categorias" className="border-b">
      <div className="no-scrollbar mx-auto flex max-w-7xl overflow-x-auto px-5 md:px-8">
        {NEWS_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onCategoryChange(item)}
            aria-pressed={category === item}
            className="shrink-0 border-b-2 border-transparent px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground aria-pressed:border-primary aria-pressed:text-foreground"
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  )
}