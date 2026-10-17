export const marketplaceCategories = [
  { name: "Electronics", slug: "electronics", symbol: "◉", desc: "Phones, computers, audio and everyday tech." },
  { name: "Fashion", slug: "fashion", symbol: "✳", desc: "Clothing, footwear, bags and personal style." },
  { name: "Books", slug: "books", symbol: "▤", desc: "Books, study materials and learning essentials." },
  { name: "Furniture", slug: "furniture", symbol: "▰", desc: "Desks, sofas, chairs and practical storage." },
  { name: "Home & Living", slug: "home-living", symbol: "⌂", desc: "Kitchenware, decor and everyday home goods." },
  { name: "Sports", slug: "sports", symbol: "↗", desc: "Fitness, outdoor and team-sport essentials." },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", symbol: "✦", desc: "Beauty tools and personal-care essentials." },
  { name: "Baby & Kids", slug: "baby-kids", symbol: "♡", desc: "Family essentials, toys and kids' items." },
  { name: "Automotive", slug: "automotive", symbol: "⌁", desc: "Vehicle accessories and motoring essentials." },
  { name: "Office & Business", slug: "office-business", symbol: "▦", desc: "Office equipment and small-business supplies." },
  { name: "Toys & Hobbies", slug: "toys-hobbies", symbol: "◇", desc: "Games, collectibles and creative hobbies." },
  { name: "Other", slug: "other", symbol: "＋", desc: "More useful finds from sellers across Kenya." },
] as const;
export function categoryForSlug(slug: string) {
  return marketplaceCategories.find((category) => category.slug === slug)?.name;
}
export function slugForCategory(name: string) {
  return marketplaceCategories.find((category) => category.name.toLowerCase() === name.toLowerCase())?.slug
    ?? name.toLowerCase().replace(/ & /g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
